# app.py - Final Version with Google OAuth
# --- Imports ---
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from flask_mail import Mail, Message
from flask import Flask, request, jsonify, send_from_directory, session, url_for, redirect ,render_template
import re
from datetime import datetime, timedelta
import os
from functools import wraps
import requests
import base64
from PIL import Image, ImageDraw
import random
from werkzeug.security import generate_password_hash, check_password_hash
import time
from flask_cors import CORS
# Email imports
import smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
# ---  IMPORT: Google OAuth  liye ---
from authlib.integrations.flask_client import OAuth
from itsdangerous import URLSafeTimedSerializer
from google import genai
import io
load_dotenv()
# --- Flask App Initialization ---
# app = Flask(__name__)
app = Flask(__name__, template_folder='.', static_folder=None)
# Yeh line frontend (port 8080) se aane waali requests ko allow karegi
CORS(app, origins=["http://localhost:8080", "https://your-app-name.up.railway.app"], supports_credentials=True)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
if not app.config['SECRET_KEY']:
    raise RuntimeError('SECRET_KEY must be configured before starting RitHan AI')
app.config['SESSION_REFRESH_EACH_REQUEST'] = True  # ✅ Har request par session refresh
s = URLSafeTimedSerializer(app.config['SECRET_KEY'])
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
# --- NEW: Flask-Mail Configuration ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('SENDER_EMAIL') # Aapke .env se SENDER_EMAIL
app.config['MAIL_PASSWORD'] = os.getenv('SENDER_PASSWORD') # Aapke .env se SENDER_PASSWORD
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('SENDER_EMAIL') # Wahi email address
mail = Mail(app) # <--- Mail extension ko initialize karein
# --- End Flask-Mail Configuration ---
HF_TOKEN = os.getenv('HF_TOKEN')
headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

# --- GOOGLE OAUTH SETUP ---
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    api_base_url='https://www.googleapis.com/oauth2/v1/', # <-- Yeh zaroori line hai
    userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',  # User info yahan se milegi
    client_kwargs={'scope': 'openid email profile'},
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration'
)


# --- Database Configuration ---

# DATABASE_URL Railway automatically aapke environment variables mein set kar deta hai
DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    """PostgreSQL database connection helper"""
    # cursor_factory=RealDictCursor se hum data ko dictionary ki tarah (e.g., user['email']) access kar sakte hain
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

# --- Database Schema & Initialization ---
def init_db():
    """Initializes the PostgreSQL database with all necessary tables."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Users Table (SERIAL use hota hai AUTOINCREMENT ki jagah)
            cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                fullname TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                is_pro BOOLEAN DEFAULT FALSE,
                is_admin BOOLEAN DEFAULT FALSE,
                credits INTEGER DEFAULT 10,
                created_at TEXT NOT NULL,
                last_login_at TEXT
            )
            """)

            # Activity Log Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                details TEXT
            )
            """)

            # Generated Images Table (Maine duplicate hata diya hai)
            cur.execute("""
            CREATE TABLE IF NOT EXISTS generated_images (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                prompt TEXT NOT NULL,
                image_url TEXT NOT NULL,
                created_at TEXT NOT NULL,
                is_deleted BOOLEAN DEFAULT FALSE
            )
            """)

            # Prompt History Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS prompt_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                prompt TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """)

            # Liked Images Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS liked_images (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                image_id INTEGER NOT NULL REFERENCES generated_images(id) ON DELETE CASCADE,
                UNIQUE(user_id, image_id)
            )
            """)

            # Subscriptions Table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plan_name TEXT NOT NULL,
                amount REAL NOT NULL,
                payment_id TEXT UNIQUE,
                start_date TEXT NOT NULL,
                end_date TEXT
            )
            """)
            conn.commit()
    print("PostgreSQL Database initialized successfully.")

def create_dummy_data():
    """Creates an initial admin only when credentials are configured."""
    from werkzeug.security import generate_password_hash

    admin_email = os.getenv('INITIAL_ADMIN_EMAIL')
    admin_password = os.getenv('INITIAL_ADMIN_PASSWORD')
    if not admin_email or not admin_password:
        print('Initial admin credentials not configured; skipping admin bootstrap.')
        return

    with get_conn() as conn:
        with conn.cursor() as cur:
            # Check if user already exists
            cur.execute("SELECT id FROM users WHERE email = %s", (admin_email,))
            if cur.fetchone():
                print("Admin already exists. Skipping dummy data.")
                return

            print("Creating dummy data for PostgreSQL...")
            now = datetime.utcnow().isoformat() + "Z"

            # 1. Create Admin User with RETURNING clause
            admin_pass_hash = generate_password_hash(admin_password, method='scrypt')
            cur.execute(
                """INSERT INTO users (fullname, email, password_hash, is_pro, is_admin, credits, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                ("Admin User", admin_email, admin_pass_hash, True, True, 9999, now)
            )

            # Yahan hum admin_id capture kar rahe hain
            admin_id = cur.fetchone()['id']

            # 2. Log Admin Signup Activity
            cur.execute(
                "INSERT INTO activity_log (user_id, action, timestamp) VALUES (%s, %s, %s)",
                (admin_id, "signup", now)
            )

            conn.commit()
            print(f"Dummy data created successfully. Admin ID: {admin_id}")



# --- Decorators for Authentication ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated_function


# --- AI Image Generation Functions ---

# --- Replace the old generate_with_stability_ai function with this FINAL CORRECTED version ---
def generate_with_stability_ai(prompt, index, user_id, init_image_bytes=None, strength=0.35):
    """Generate image using Stability AI, supporting image-to-image with resizing and correct logic."""
    try:
        STABILITY_API_KEY = os.getenv('STABILITY_API_KEY')
        if not STABILITY_API_KEY:
            print("Stability API key not found")
            return None

        # Prepare headers common to both request types
        headers = {
            "Authorization": f"Bearer {STABILITY_API_KEY}",
            "Accept": "application/json"
        }

        response = None # Initialize response variable
        resized_image_bytes = None # Initialize resized image bytes

        # --- IMAGE-TO-IMAGE LOGIC ---
        if init_image_bytes:
            print("Attempting Image-to-Image...")
            # --- RESIZE IMAGE ---
            try:
                img = Image.open(io.BytesIO(init_image_bytes))
                # Resize to 1024x1024 (you can choose another allowed dimension if needed)
                img = img.resize((1024, 1024))
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                resized_image_bytes = buffer.getvalue()
                print("Guidance image resized to 1024x1024.")
            except Exception as resize_error:
                print(f"Error resizing guidance image: {resize_error}. Falling back to Text-to-Image.")
                # Keep resized_image_bytes as None to trigger fallback

            # If resize was successful, prepare and make the image-to-image request
            if resized_image_bytes:
                API_URL = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image"
                print("Using Stability AI: Image-to-Image Request")
                payload = {
                    'text_prompts[0][text]': prompt,
                    'cfg_scale': '7',
                    'samples': '1',
                    'steps': '30',
                    'init_image_mode': 'IMAGE_STRENGTH',
                    'image_strength': str(strength)
                }
                files = {'init_image': ('init_image.png', resized_image_bytes, 'image/png')}

                try:
                    # Make the Image-to-Image request
                    response = requests.post(API_URL, headers=headers, data=payload, files=files, timeout=60)
                except requests.exceptions.RequestException as req_err:
                     print(f"Image-to-Image request failed: {req_err}. Falling back to Text-to-Image.")
                     # response remains None, will trigger text-to-image

        # --- TEXT-TO-IMAGE LOGIC ---
        # Run this ONLY if response is still None (meaning image-to-image was skipped, resize failed, or request failed)
        if response is None:
            API_URL = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"
            print("Using Stability AI: Text-to-Image Request")

            # Use correct headers and payload format for text-to-image
            text_headers = headers.copy() # Avoid modifying original headers
            text_headers['Content-Type'] = 'application/json'

            payload = {
                "text_prompts": [{"text": prompt}],
                "cfg_scale": 7,
                "height": 1024,
                "width": 1024,
                "samples": 1,
                "steps": 30,
            }

            try:
                # Make the Text-to-Image request
                response = requests.post(API_URL, headers=text_headers, json=payload, timeout=45)
            except requests.exceptions.RequestException as req_err:
                 print(f"Text-to-Image request failed: {req_err}")
                 # response remains None

        # --- Process Response (Common Logic) ---
        if response is None: # If both attempts failed before making a request or requests failed
            print("Stability AI generation failed after attempting both methods.")
            return None

        # Check response status code (from whichever request succeeded)
        if response.status_code != 200:
            try: error_details = response.json()
            except: error_details = response.text
            print(f"Stability AI Error: {response.status_code} - {error_details}")
            return None

        response_data = response.json()
        if not response_data.get("artifacts"):
             print(f"Stability AI Error: No artifacts found in response: {response_data}")
             return None

        image_data = response_data["artifacts"][0]["base64"]
        image_bytes_result = base64.b64decode(image_data)

        # Save image (same as before)
        image_filename = f"stability_{user_id}_{int(datetime.utcnow().timestamp())}_{index}.png"
        image_path = os.path.join('static', 'generated', image_filename)
        os.makedirs(os.path.dirname(image_path), exist_ok=True)
        with open(image_path, 'wb') as f:
            f.write(image_bytes_result)

        return f"/static/generated/{image_filename}"

    except Exception as e:
        import traceback
        print(f"Stability AI generation failed: {e}")
        traceback.print_exc()
        return None
# Hugging Face function
def generate_with_huggingface(prompt, index, user_id):
    """Generate image using Hugging Face"""
    try:
        API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5"

        headers = {}

        # Wait  model load
        max_retries = 3
        for attempt in range(max_retries):
            response = requests.post(
                API_URL,
                headers=headers,
                json={"inputs": prompt},
                timeout=60  # Timeout
            )

            if response.status_code == 200:
                # Image save
                image_filename = f"hf_{user_id}_{int(datetime.utcnow().timestamp())}_{index}.png"
                image_path = os.path.join('static', 'generated', image_filename)

                os.makedirs(os.path.dirname(image_path), exist_ok=True)

                with open(image_path, 'wb') as f:
                    f.write(response.content)

                return f"/static/generated/{image_filename}"

            elif response.status_code == 503:
                # Model loading , wait
                wait_time = 10 * (attempt + 1)
                print(f"Model loading, waiting {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                print(f"Hugging Face Error: {response.status_code} - {response.text}")
                return None

        return None

    except Exception as e:
        print(f"Hugging Face generation failed: {e}")
        return None

def generate_with_pollinations(prompt, width, height, user_id):
    """Generate image using Pollinations.ai with specific dimensions"""
    try:
        safe_prompt = requests.utils.quote(prompt)

        image_url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width={width}&height={height}&seed={random.randint(1, 10000)}"

        print(f"Generated Pollinations URL: {image_url}")
        return image_url

    except Exception as e:
        print(f"Pollinations.ai generation failed: {e}")
        return None
def generate_with_local_fallback(prompt, index, user_id):
    """Local fallback if all APIs fail"""
    try:
        # Create a simple image with Pillow
        img = Image.new('RGB', (512, 512), color=(
            random.randint(0, 255),
            random.randint(0, 255),
            random.randint(0, 255)
        ))

        draw = ImageDraw.Draw(img)

        # Save image
        image_filename = f"local_{user_id}_{int(datetime.utcnow().timestamp())}_{index}.png"
        image_path = os.path.join('static', 'generated', image_filename)

        os.makedirs(os.path.dirname(image_path), exist_ok=True)
        img.save(image_path)

        return f"/static/generated/{image_filename}"

    except Exception as e:
        print(f"Local fallback failed: {e}")
        return None



# --- Standard User Routes (Authentication) ---
# ✅ SAHI (PostgreSQL Pattern)
@app.route("/api/user/profile", methods=["GET"])
@login_required
def get_user_profile():
    with get_conn() as conn:
        with conn.cursor() as cur: # <-- Hamesha cursor open karein
            # ? ko %s mein badlein
            cur.execute("SELECT fullname, credits, is_pro FROM users WHERE id = %s", (session['user_id'],))
            user = cur.fetchone()

            if not user:
                return jsonify({"error": "User not found"}), 404

            return jsonify({
                "fullname": user["fullname"],
                "credits": user["credits"],
                "isPro": bool(user["is_pro"]),
                "profile_pic": session.get('profile_pic')
            }), 200

# Is naye function ko app.py mein add karein
# Yeh saare naye functions app.py mein add karein

@app.route("/api/user/images", methods=["GET"])
@login_required
def get_user_images():
    user_id = session['user_id']
    query = "SELECT id, prompt, image_url as src FROM generated_images WHERE user_id = %s AND is_deleted = FALSE ORDER BY created_at DESC"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_id,))
            images = [dict(row) for row in cur.fetchall()]
    return jsonify(images)

@app.route("/api/user/history", methods=["GET"])
@login_required
def get_user_history():
    user_id = session['user_id']
    query = "SELECT id, prompt FROM prompt_history WHERE user_id = %s ORDER BY created_at DESC LIMIT 100"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_id,))
            history_items = [dict(row) for row in cur.fetchall()]
    return jsonify(history_items)

@app.route("/api/user/likes", methods=["GET"])
@login_required
def get_user_likes():
    user_id = session['user_id']
    query = """
        SELECT g.id, g.prompt, g.image_url as src
        FROM liked_images l
        JOIN generated_images g ON l.image_id = g.id
        WHERE l.user_id = %s AND g.is_deleted = FALSE
        ORDER BY l.id DESC
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_id,))
            liked_images = [dict(row) for row in cur.fetchall()]
    return jsonify(liked_images)

@app.route("/api/images/like", methods=["POST"])
@login_required
def toggle_like():
    user_id = session['user_id']
    data = request.get_json()
    image_id = data.get('image_id')
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM liked_images WHERE user_id = %s AND image_id = %s", (user_id, image_id))
            existing = cur.fetchone()
            if existing:
                cur.execute("DELETE FROM liked_images WHERE id = %s", (existing['id'],))
                liked = False
            else:
                cur.execute("INSERT INTO liked_images (user_id, image_id) VALUES (%s, %s)", (user_id, image_id))
                liked = True
            conn.commit()
    return jsonify({"status": "success", "liked": liked})

# --- NEW ROUTE TO DELETE HISTORY ITEM ---
@app.route('/api/history/<int:history_id>', methods=['DELETE'])
@login_required
def delete_history_item(history_id):
    user_id = session['user_id']
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM prompt_history WHERE id = %s AND user_id = %s", (history_id, user_id))
                conn.commit()
                # Direct cursor se rowcount check karein
                if cur.rowcount == 0:
                    return jsonify({"error": "History item not found."}), 404
            return jsonify({"message": "Deleted successfully."}), 200
    except Exception as e: # .Error ki jagah Exception use karein
        return jsonify({"error": str(e)}), 500

# --- Helper Functions ---
def valid_email(email: str) -> bool:
    return bool(email and re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))

def valid_password(pw: str) -> bool:
    return bool(pw and len(pw) >= 8)

# --- GOOGLE LOGIN ROUTES ---
@app.route('/login/google')
def google_login():
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/login/google/callback')
def google_callback():
    try:
        token = google.authorize_access_token()
        user_info = google.get('userinfo').json()

        email = user_info.get('email')
        fullname = user_info.get('name')
        picture = user_info.get('picture') # Humne yahan 'picture' haasil kiya

        if not email:
            return "Email not found from Google. Please try again.", 400

        with get_conn() as conn:
           with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cur.fetchone()

            if not user:
                from uuid import uuid4
                unusable_password = generate_password_hash(str(uuid4()), method='scrypt')
                now = datetime.utcnow().isoformat() + "Z"

                cur.execute(
                 "INSERT INTO users(fullname, email, password_hash, created_at) VALUES(%s,%s,%s,%s) RETURNING id",
                    (fullname, email, unusable_password, now)
                )
                user_id = cur.fetchone()['id']
                conn.commit()
                # Fetch again to get full user object
                cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                user = cur.fetchone()

            # Session create karte waqt 'profile_pic' ko save karna zaroori hai
            session.permanent = True
            session['user_id'] = user['id']
            session['fullname'] = user['fullname']
            session['is_admin'] = bool(user['is_admin'])
            session['profile_pic'] = picture # <-- YEH LINE SABSE ZAROORI HAI

            return redirect('/Dashboard.html')

    except Exception as e:
        print(f"Google OAuth Error: {e}")
        return "An error occurred during Google authentication. Please try again.", 500
# Puraane /signup function ko isse replace karein
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    fullname = (data.get("fullname") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not all([fullname, valid_email(email), valid_password(password)]):
        return jsonify({"error": "Invalid or missing data."}), 400
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM users WHERE email = %s", (email,))
                if cur.fetchone():
                    return jsonify({"error": "This email is already registered."}), 409

        pw_hash = generate_password_hash(password, method='scrypt')
        otp = str(random.randint(1000, 9999))
        session['unverified_user'] = {
            'fullname': fullname,
            'email': email,
            'password_hash': pw_hash,
            'otp': otp,
            'timestamp': datetime.utcnow().isoformat()
        }
        send_real_otp_email(email, otp)
        return jsonify({"message": "OTP sent to your email.", "email": email}), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

# Yeh naya function add karein
@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    otp_from_user = data.get('otp')
    unverified_user = session.get('unverified_user')
    if not unverified_user or unverified_user.get('email') != email:
        return jsonify({"error": "No pending verification found. Please sign up again."}), 400
    if datetime.utcnow() > datetime.fromisoformat(unverified_user['timestamp']) + timedelta(minutes=10):
        session.pop('unverified_user', None)
        return jsonify({"error": "OTP has expired. Please sign up again."}), 400
    if unverified_user['otp'] != otp_from_user:
        return jsonify({"error": "Invalid OTP. Please try again."}), 400
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                now = datetime.utcnow().isoformat() + "Z"
                # PostgreSQL pattern: Use %s and RETURNING id
                cur.execute(
                    "INSERT INTO users(fullname, email, password_hash, created_at) VALUES(%s,%s,%s,%s) RETURNING id",
                    (unverified_user['fullname'], unverified_user['email'], unverified_user['password_hash'], now)
                )
                user_id = cur.fetchone()['id']
                cur.execute("INSERT INTO activity_log(user_id, action, timestamp) VALUES(%s,%s,%s)", (user_id, "signup", now))
                conn.commit()

        fullname = unverified_user['fullname']
        session.pop('unverified_user', None)
        session.permanent = True
        session['user_id'] = user_id
        session['fullname'] = fullname
        session['is_admin'] = False
        return jsonify({"message": "Verified! Redirecting to your dashboard...", "loggedIn": True}), 201
    except Exception as e: # Yahan badal dein
        return jsonify({"error": f"Database error: {e}"}), 500
    # Line ke aakhir se '\' hata dein

# Puraane /login function ko isse replace karein
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not valid_email(email) or not password:
        return jsonify({"error": "Email and password are required."}), 400

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                user = cur.fetchone()

                if not user or not check_password_hash(user["password_hash"], password):
                    return jsonify({"error": "Invalid email or password."}), 401

                now = datetime.utcnow().isoformat() + "Z"
                cur.execute("UPDATE users SET last_login_at = %s WHERE id = %s", (now, user["id"]))
                cur.execute("INSERT INTO activity_log(user_id, action, timestamp) VALUES (%s,%s,%s)", (user["id"], "login", now))
                conn.commit()
            session.permanent = True
            session['user_id'] = user['id']
            session['fullname'] = user['fullname']
            session['is_admin'] = user['is_admin']

            return jsonify({"message": "Login successful!", "user": {"id": user["id"], "fullname": user["fullname"]}}), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

# Puraane /logout function ko isse replace karein
@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

@app.route("/check-auth", methods=["GET"])
def check_auth():
    if 'user_id' in session:
        return jsonify({
            "loggedIn": True,
            "user": {
                "id": session['user_id'],
                "fullname": session['fullname'],
                "isAdmin": session.get('is_admin', False),
                "profile_pic": session.get('profile_pic') # <-- YEH NAYI LINE HAI
            }
        }), 200
    return jsonify({"loggedIn": False}), 200
# Yeh naya function add karein
def send_real_otp_email(receiver_email, otp):
    """Sends a real OTP email using SMTP credentials from .env file."""
    sender_email = os.getenv("SENDER_EMAIL")
    password = os.getenv("SENDER_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 465))

    if not all([sender_email, password, smtp_server]):
        print("!!! Email credentials not set in .env file. Falling back to console print. !!!")
        print(f"OTP for {receiver_email} is: {otp}")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Your RitHan AI Verification Code: {otp}"
    message["From"] = sender_email
    message["To"] = receiver_email

    text = f"Hi,\n\nYour OTP for RitHan AI is: {otp}\nThis code is valid for 10 minutes."
    html = f"""
    <html><body><div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
    <h2>RitHan AI Verification</h2><p>Your one-time password (OTP) is:</p>
    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; background-color: #f0f0f0; padding: 10px 20px; border-radius: 5px; display: inline-block;">{otp}</p>
    <p>This code is valid for 10 minutes.</p></div></body></html>
    """
    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    message.attach(part1)
    message.attach(part2)

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context) as server:
            server.login(sender_email, password)
            server.sendmail(sender_email, receiver_email, message.as_string())
        print(f"OTP email sent successfully to {receiver_email}")
    except Exception as e:
        print(f"!!! Error sending email: {e} !!!")
        print(f"--- FALLBACK OTP (PRINTING TO CONSOLE) ---\nOTP for {receiver_email} is: {otp}")
# Yeh function dhoondhen aur isse replace karein
# Agar yeh function nahi hai, toh ise poora add karein.
# Yeh usually woh function hoga jo password reset link banata hai aur bhejta hai.

def send_reset_email(user_email, token):
    reset_link = url_for('reset_password', token=token, _external=True) # _external=True zaroori hai
    msg = Message('Password Reset Request for RitHan AI', # Email subject line
                  sender=app.config['MAIL_DEFAULT_SENDER'], # Aapka bhejnewala email
                  recipients=[user_email]) # Jise email bhejna hai

    msg.body = f"""Hello,

You have requested a password reset for your RitHan AI account.

To reset your password, please click on the following link:
{reset_link}

If you did not request a password reset, please ignore this email. Your password will remain unchanged.

Thank you,
The RitHan AI Team
"""
    try:
        mail.send(msg)
        print(f"DEBUG: Password reset email SENT to {user_email}") # Terminal confirmation
        return True
    except Exception as e:
        print(f"ERROR: Failed to send email to {user_email}: {e}") # Error message in terminal
        return False
def send_password_reset_email(email):
    token = s.dumps(email, salt='password-reset-salt')
    reset_url = url_for('reset_with_token', token=token, _external=True)

    sender_email = os.getenv("SENDER_EMAIL")
    password = os.getenv("SENDER_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 465))

    if not all([sender_email, password, smtp_server]):
        print("!!! Email credentials not set in .env file. Cannot send reset email. !!!")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset Your Password for RitHan AI"
    message["From"] = sender_email
    message["To"] = email

    text = f"Hi,\n\nPlease click the link below to reset your password:\n{reset_url}\n\nIf you did not request this, please ignore this email."
    html = f"""
    <html>
    <body>
        <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Reset Your Password for RitHan AI</h2>
        <p>Please click the button below to reset your password. This link is valid for one hour.</p>
        <a href="{reset_url}" style="background-color: #66FCF1; color: #0B0C10; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Reset Password
        </a>
        <p style="margin-top: 20px;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
    </body>
    </html>
    """

    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    message.attach(part1)
    message.attach(part2)

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context) as server:
            server.login(sender_email, password)
            server.sendmail(sender_email, email, message.as_string())
        print(f"Password reset email sent successfully to {email}")
    except Exception as e:
        print(f"!!! Error sending password reset email: {e} !!!")
 # --- NAYA FUNCTION: PROMPT ENHANCER (GEMINI) ---
 # --- Yeh naya function app.py mein add karein ---
def send_contact_email(name, from_email, message):
    """Sends the contact form message to your personal email."""

    # YAHAN APNA ASLI EMAIL DAALEIN
    YOUR_PERSONAL_EMAIL = "kureshif624@gmail.com"

    sender_email = os.getenv("SENDER_EMAIL")
    password = os.getenv("SENDER_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 465))

    if not all([sender_email, password, smtp_server]):
        print("!!! Email credentials not set in .env file. Cannot send contact form. !!!")
        return False

    # Email ka content banayein
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"New Contact Form Message from {name}"
    msg["From"] = sender_email # Bhejne waala (aapka bot)
    msg["To"] = YOUR_PERSONAL_EMAIL # Paane waala (Aap)

    text = f"You have a new message from:\nName: {name}\nEmail: {from_email}\n\nMessage:\n{message}"
    html = f"""
    <html><body>
    <p>You have a new contact form submission:</p>
    <ul style="list-style-type: none; padding: 0;">
        <li><strong>Name:</strong> {name}</li>
        <li><strong>Email:</strong> {from_email}</li>
    </ul>
    <p><strong>Message:</strong></p>
    <p style="border: 1px solid #ccc; padding: 10px; border-radius: 5px;">{message}</p>
    </body></html>
    """

    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    msg.attach(part1)
    msg.attach(part2)

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context) as server:
            server.login(sender_email, password)
            server.sendmail(sender_email, YOUR_PERSONAL_EMAIL, msg.as_string())
        print(f"Contact form message sent successfully to {YOUR_PERSONAL_EMAIL}")
        return True
    except Exception as e:
        print(f"!!! Error sending contact form email: {e} !!!")
        return False
def enhance_prompt_with_ai(simple_prompt):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Gemini API key not found. Skipping enhancement.")
        return simple_prompt

    try:
        # Client initialize karein
        client = genai.Client(api_key=api_key)

        instruction = (
            "You are an expert prompt creator for text-to-image AI models. "
            "Expand the user's simple idea into a rich, detailed, and visually descriptive prompt. "
            "Only respond with the prompt itself. User's idea: "
        )

        # Content generate karne ka naya tarika
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=instruction + simple_prompt
        )

        enhanced_prompt = response.text.strip()
        print(f"Enhanced Prompt: {enhanced_prompt}")
        return enhanced_prompt

    except Exception as e:
        print(f"Gemini API error: {e}")
        return simple_prompt

# --- NAYA CENTRAL FUNCTION JO PROVIDER CHOOSE KAREGA ---
def generate_ai_image(prompt, index, user_id):
    provider = os.getenv("IMAGE_PROVIDER", "huggingface").lower()

    if provider == "pollinations":
        print("Using image provider: pollinations")
        print("Calling Pollinations.ai...")
        return generate_with_pollinations(prompt, index, user_id)

    elif provider == "stability":
        print("Using image provider: stability")
        print("Calling Stability AI...")
        return generate_with_stability_ai(prompt, index, user_id)

    else: # Default case for "huggingface" or any other value
        print("Using image provider: huggingface")
        print("Calling Hugging Face...")
        # YAHAN SAHI FUNCTION CALL KIYA GAYA HAI
        return generate_with_huggingface(prompt, index, user_id)

# --- UPDATED /generate-image Route ---
@app.route("/generate-image", methods=["POST"])
def generate_image():
    # .env file se provider ka naam padhein
    provider = os.getenv("IMAGE_PROVIDER", "stability")
    print(f"Using image provider: {provider}")

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request data. Send JSON."}), 400

        base_prompt = data.get("prompt", "")
        num_images = data.get("numImages", 1)
        aspect_ratio = data.get("aspectRatio", "1:1")
        should_enhance = data.get("enhancePrompt", False)

        # --- GUEST HANDLING LOGIC ---
        user_id = session.get('user_id')
        is_guest = user_id is None
        current_credits_from_request = data.get("currentCredits", 4) if is_guest else 0
        guest_calculated_new_credits = 0
        user = None

        if is_guest:
            if num_images > 1:
                return jsonify({"error": "Guests can only generate 1 image at a time."}), 400
            if current_credits_from_request < num_images:
                return jsonify({"error": f"Not enough guest credits. You need {num_images}."}), 402

            guest_calculated_new_credits = current_credits_from_request - num_images
        else:
            # PostgreSQL Pattern for Credit Check
            try:
                with get_conn() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT credits, is_pro FROM users WHERE id = %s", (user_id,))
                        user = cur.fetchone()
                        if not user:
                            session.clear()
                            return jsonify({"error": "Invalid session. Please log in again."}), 401

                        if not user['is_pro'] and user['credits'] < num_images:
                             return jsonify({"error": f"Not enough credits. You need {num_images}."}), 402
            except Exception as db_err:
                 print(f"Database error checking credits: {db_err}")
                 return jsonify({"error": "Database error checking credits."}), 500
        # --- END GUEST HANDLING LOGIC ---

        if not base_prompt:
            return jsonify({"error": "Prompt is required."}), 400

        # Aspect Ratio logic
        aspect_ratios = {"1:1": (512, 512), "16:9": (1024, 576), "9:16": (576, 1024), "4:3": (768, 576), "3:4": (576, 768)}
        width, height = aspect_ratios.get(aspect_ratio, (512, 512))

        # Final Prompt logic
        final_prompt = base_prompt
        if should_enhance and not is_guest:
            final_prompt = enhance_prompt_with_ai(base_prompt)

        # Handle guidance image
        guidance_image_base64 = data.get("guidanceImage")
        init_image_bytes = None
        strength_from_request = data.get("imageStrength", 0.35)

        if guidance_image_base64 and not is_guest and provider == "stability":
            try:
                encoded = guidance_image_base64.split(',', 1)[1] if ',' in guidance_image_base64 else guidance_image_base64
                init_image_bytes = base64.b64decode(encoded)
            except Exception as e:
                print(f"Error decoding image: {e}")

        # --- IMAGE GENERATION LOOP ---
        now = datetime.utcnow().isoformat() + "Z"
        generated_images_data = []
        actual_user_identifier = user_id if not is_guest else "guest"

        for i in range(num_images):
            image_url = None
            # Provider functions call
            if provider == "stability":
                 image_url = generate_with_stability_ai(final_prompt, i, actual_user_identifier, init_image_bytes, strength_from_request)
            elif provider == "pollinations":
                 image_url = generate_with_pollinations(final_prompt, width, height, actual_user_identifier)
            elif provider == "huggingface":
                 image_url = generate_with_huggingface(final_prompt, i, actual_user_identifier)
            else:
                 image_url = generate_with_local_fallback(final_prompt, i, actual_user_identifier)

            if image_url:
                image_id = None
                if not is_guest:
                    try:
                        with get_conn() as conn:
                          with conn.cursor() as cur:
                              # ✅ Sahi PostgreSQL Insert with RETURNING id
                              cur.execute(
                                  "INSERT INTO generated_images (user_id, prompt, image_url, created_at) VALUES (%s, %s, %s, %s) RETURNING id",
                                  (user_id, final_prompt, image_url, now)
                              )
                              image_id = cur.fetchone()['id']
                              cur.execute("INSERT INTO prompt_history (user_id, prompt, created_at) VALUES (%s, %s, %s)", (user_id, final_prompt, now))
                              conn.commit()
                    except Exception as db_err:
                      print(f"Database error saving image: {db_err}")

                generated_images_data.append({"id": image_id, "src": image_url, "prompt": final_prompt})

        # --- CREDIT DEDUCTION (RE-WRITTEN FOR POSTGRESQL) ---
        new_credits = 0
        if is_guest:
            new_credits = guest_calculated_new_credits
        else:
            if user and not user['is_pro']:
                try:
                    with get_conn() as conn:
                        with conn.cursor() as cur:
                            successful_generations = len(generated_images_data)
                            if successful_generations > 0:
                                # ✅ Sahi %s placeholder use kiya hai
                                cur.execute("UPDATE users SET credits = credits - %s WHERE id = %s", (successful_generations, user_id))
                                conn.commit()
                                # Updated credits fetch karo
                                cur.execute("SELECT credits FROM users WHERE id = %s", (user_id,))
                                updated_data = cur.fetchone()
                                new_credits = updated_data['credits'] if updated_data else user['credits']
                except Exception as db_err:
                     print(f"Error deducting credits: {db_err}")
                     new_credits = user['credits']
            else:
                new_credits = user['credits'] if user else 0

        if not generated_images_data and num_images > 0:
             return jsonify({"error": "Image generation failed."}), 500

        return jsonify({
            "image_data_list": generated_images_data,
            "new_credits": new_credits
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

# --- ADMIN API Routes ---
@app.route("/api/admin/stats", methods=["GET"])
@admin_required
def get_admin_stats():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as c FROM users")
            total_users = cur.fetchone()['c']
            cur.execute("SELECT COUNT(*) as c FROM users WHERE is_pro = TRUE")
            pro_users = cur.fetchone()['c']
            cur.execute("SELECT COUNT(*) as c FROM generated_images WHERE is_deleted = FALSE")
            images_generated = cur.fetchone()['c']
            cur.execute("SELECT SUM(amount) as s FROM subscriptions")
            total_revenue = cur.fetchone()['s'] or 0

            thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat() + "Z"
            cur.execute(
                "SELECT LEFT(created_at, 10) as date, COUNT(*) as count FROM users WHERE created_at >= %s GROUP BY date ORDER BY date",
                (thirty_days_ago,)
            )
            signup_trend = {row['date']: row['count'] for row in cur.fetchall()}

            two_years_ago = (datetime.utcnow() - timedelta(days=731)).isoformat() + "Z"
            cur.execute(
                "SELECT LEFT(created_at, 7) as month, COUNT(*) as count FROM users WHERE created_at >= %s GROUP BY month ORDER BY month",
                (two_years_ago,)
            )
            signup_trend_monthly = {row['month']: row['count'] for row in cur.fetchall()}

            cur.execute("""
                SELECT u.fullname, a.action, a.timestamp FROM activity_log a
                JOIN users u ON u.id = a.user_id
                ORDER BY a.timestamp DESC LIMIT 5
            """)
            recent_activity = [dict(row) for row in cur.fetchall()]

            return jsonify({
                "stats": {
                    "totalUsers": total_users,
                    "proUsers": pro_users,
                    "imagesGenerated": images_generated,
                    "totalRevenue": f"{total_revenue:.2f}"
                },
                "charts": {
                    "signupTrend": signup_trend,
                    "signupTrendMonthly": signup_trend_monthly
                },
                "recentActivity": recent_activity
            })

@app.route("/api/admin/users", methods=["GET"])
@admin_required
def get_users():
    search = request.args.get("search", "")
    with get_conn() as conn:
        with conn.cursor() as cur:
            if search:
                query = "SELECT id, fullname, email, is_pro, credits, last_login_at, created_at FROM users WHERE fullname ILIKE %s OR email ILIKE %s"
                cur.execute(query, (f"%{search}%", f"%{search}%"))
            else:
                cur.execute("SELECT id, fullname, email, is_pro, credits, last_login_at, created_at FROM users ORDER BY created_at DESC")
            users = [dict(row) for row in cur.fetchall()]
    return jsonify(users)

@app.route("/api/admin/users/<int:user_id>", methods=["POST"])
@admin_required
def update_user(user_id):
    data = request.get_json()
    action = data.get("action")

    # Yahan variables ko define karna zaroori hai
    new_status = data.get("status")
    amount = data.get("amount", 0)

    with get_conn() as conn:
        with conn.cursor() as cur:
            if action == "toggle_pro":
                cur.execute("UPDATE users SET is_pro = %s WHERE id = %s", (new_status, user_id))
            elif action == "add_credits":
                cur.execute("UPDATE users SET credits = credits + %s WHERE id = %s", (amount, user_id))
            else:
                return jsonify({"error": "Invalid action"}), 400
            conn.commit()

    return jsonify({"message": "User updated successfully"})
# --- NAYA USER DELETE ROUTE ---
@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user_by_admin(user_id):
    if user_id == 1:
         return jsonify({"error": "Cannot delete the primary admin account."}), 403

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # Check if user exists using %s
                cur.execute("SELECT 1 FROM users WHERE id = %s", (user_id,))
                if not cur.fetchone():
                    return jsonify({"error": "User not found."}), 404

                # Delete user using %s
                cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
                conn.commit()
                return jsonify({"message": f"User ID {user_id} deleted successfully."}), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500


@app.route("/api/admin/images", methods=["GET"])
@admin_required
def get_images():
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Sirf ek hi query rakhein jo PostgreSQL compatible ho
            cur.execute("""
                SELECT i.id, i.prompt, i.image_url, i.created_at, u.fullname
                FROM generated_images i
                JOIN users u ON u.id = i.user_id
                WHERE i.is_deleted = FALSE
                ORDER BY i.created_at DESC
            """)
            images = [dict(row) for row in cur.fetchall()]
    return jsonify(images)
# --- UPDATED ROUTE TO DELETE IMAGE (User or Admin) ---
@app.route("/api/admin/images/<int:image_id>", methods=["DELETE"])
@login_required
def delete_image(image_id):
    user_id = session['user_id']
    is_admin = session.get('is_admin', False)

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # %s aur FALSE use karein
                cur.execute("SELECT user_id FROM generated_images WHERE id = %s AND is_deleted = FALSE", (image_id,))
                image_owner = cur.fetchone()

                if not image_owner:
                    return jsonify({"error": "Image not found."}), 404

                if image_owner['user_id'] == user_id or is_admin:
                    # TRUE use karein soft delete ke liye
                    cur.execute("UPDATE generated_images SET is_deleted = TRUE WHERE id = %s", (image_id,))
                    cur.execute("DELETE FROM liked_images WHERE image_id = %s", (image_id,))
                    conn.commit()
                    return jsonify({"message": "Image deleted successfully."}), 200
                else:
                    return jsonify({"error": "Permission denied."}), 403

    except Exception as e: # .Error ki jagah Exception use karein
        return jsonify({"error": str(e)}), 500

# --- Static File Serving ---
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/health')
def health():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT COUNT(*) FROM users')
                cur.fetchone()
        return jsonify({'status': 'ok'})
    except Exception:
        return jsonify({'status': 'database_unavailable'}), 503
@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.json.get('email')
        with get_conn() as conn:
          with conn.cursor() as cur:
           cur.execute("SELECT * FROM users WHERE email = %s", (email,))
           user = cur.fetchone()

        # Bhale hi user na mile, hum success message dikhayenge
        if user:
            send_password_reset_email(email)

        return jsonify({'message': 'If an account with that email exists, a password reset link has been sent (check your terminal).'})
    return render_template('forgot_password.html')

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_with_token(token):
    try:
        email = s.loads(token, salt='password-reset-salt', max_age=3600)
    except Exception as e:
        return "The password reset link is invalid or has expired.", 400

    if request.method == 'POST':
        password = request.json.get('password')
        if not valid_password(password):
            return jsonify({'error': 'Password must be at least 8 characters long.'}), 400

        new_password_hash = generate_password_hash(password, method='scrypt')

        # ✅ Yeh block IF ke andar hona chahiye
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET password_hash = %s WHERE email = %s", (new_password_hash, email))
                conn.commit()
                return jsonify({'message': 'Your password has been updated successfully!'})

    return render_template('reset_password.html', token=token)
# Puraane serve_static function ko isse replace karein
@app.route('/<path:filename>')
def serve_static(filename):
    public_pages = {
        'Dashboard.html', 'community.html', 'features.html',
        'forgot_password.html', 'index.html', 'login_patched.html',
        'otp_verify.html', 'pricing.html', 'reset_password.html',
        'signup_patched.html',
    }
    if filename == 'admin.html':
        if not session.get('is_admin'):
            return 'Access Denied.', 403
        return send_from_directory('.', filename)
    if filename in public_pages:
        return send_from_directory('.', filename)
    allowed_directories = {'css': {'.css'}, 'js': {'.js'},
                           'images': {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico'},
                           'static': {'.png', '.jpg', '.jpeg', '.webp', '.gif'}}
    parts = filename.replace('\\', '/').split('/')
    if (len(parts) < 2 or any(part in ('', '.', '..') or part.startswith('.') for part in parts)
            or parts[0] not in allowed_directories
            or os.path.splitext(parts[-1])[1].lower() not in allowed_directories[parts[0]]):
        return 'Not Found', 404
    if parts[0] == 'static' and parts[1] != 'generated':
        return 'Not Found', 404
    if parts[0] == 'static' and not os.path.isfile(filename):
        return send_from_directory('backend', filename)
    return send_from_directory('.', filename)

# --- Error Handlers ---
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500
# --- Yeh naya route app.py mein add karein ---
@app.route('/contact-submit', methods=['POST'])
def handle_contact_submit():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not all([name, email, message]):
        return jsonify({"error": "All fields are required."}), 400

    success = send_contact_email(name, email, message)

    if success:
        return jsonify({"message": "Message sent successfully!"}), 200
    else:
        return jsonify({"error": "Failed to send message. Please try again later."}), 500
    # --- NAYA SEARCH ROUTE ---
@app.route('/api/search', methods=['GET'])
@login_required
def search_content():
    query = request.args.get('q', '').strip()
    user_id = session['user_id']
    results = []
    if not query: return jsonify(results)

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # 1. Search in History (%s and ILIKE for Postgres)
                cur.execute(
                    "SELECT id, prompt, created_at FROM prompt_history WHERE user_id = %s AND prompt ILIKE %s ORDER BY created_at DESC LIMIT 10",
                    (user_id, f"%{query}%")
                )
                for row in cur.fetchall():
                    results.append({"id": f"h_{row['id']}", "type": "history", "text": row['prompt'], "date": row['created_at']})

                # 2. Search in Images (is_deleted = FALSE for Postgres)
                cur.execute(
                    """SELECT id, prompt, image_url, created_at FROM generated_images
                       WHERE user_id = %s AND is_deleted = FALSE AND prompt ILIKE %s
                       ORDER BY created_at DESC LIMIT 10""",
                    (user_id, f"%{query}%")
                )
                for row in cur.fetchall():
                    if not any(r['type'] == 'history' and r['text'] == row['prompt'] for r in results):
                         results.append({"id": f"g_{row['id']}", "type": "image", "text": row['prompt'], "imageUrl": row['image_url'], "date": row['created_at']})

        return jsonify(results)
    except Exception as e:
        return jsonify({"error": "Search failed"}), 500
# --- Main Execution ---
if __name__ == "__main__":
    with app.app_context(): # Database setup ko context ke andar rakhein
        try:
            print("Railway Startup: Initializing database...")
            init_db()
            create_dummy_data()
        except Exception as e:
            print(f"Database setup error: {e}")

    os.makedirs('static/generated', exist_ok=True)
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
