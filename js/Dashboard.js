// Dashboard.js - Final Complete Version with All Bug Fixes

document.addEventListener('DOMContentLoaded', function () {
    // Timeout variable to fix the mobile panel click bug
    let closePanelTimeout = null;
    let isPanelTransitioning = false;

    // ==================== DOM ELEMENTS ====================
    const sidebar = document.getElementById('sidebar');
    const enhancePromptToggle = document.getElementById('enhance-prompt-toggle');
    const menuButton = document.getElementById('menu-button');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const allPages = document.querySelectorAll('.page-view');
    const navLinks = document.querySelectorAll('.sidebar-link');
    const generationSettings = document.getElementById('generation-settings');
    const accordions = document.querySelectorAll('.accordion-header');
    const accountButton = document.getElementById('account-button');
    const accountDropdown = document.getElementById('account-dropdown');
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');
    const creditCounter = document.getElementById('credit-counter');
    const loggedInView = document.getElementById('logged-in-view');
    const loggedOutView = document.getElementById('logged-out-view');
    const signOutBtn = document.getElementById('sign-out-btn');
    const dropdownUsername = document.getElementById('dropdown-username');
    const lightThemeBtn = document.getElementById('light-theme-btn');
    const darkThemeBtn = document.getElementById('dark-theme-btn');
    const generateBtn = document.getElementById('generate-btn');
    const promptInput = document.getElementById('prompt-input');
    const loaderContainer = document.getElementById('loader-container');
    const errorContainer = document.getElementById('error-container');
    const numImageButtons = document.querySelectorAll('.num-btn');
    const myImagesGalleryContainer = document.getElementById('my-images-gallery-container');
    const likedImagesGalleryContainer = document.getElementById('liked-images-gallery-container');
    const historyContainer = document.getElementById('history-container');
    const imageDropZone = document.getElementById('image-drop-zone');
    const imageUploadInput = document.getElementById('image-upload-input');
    const imagePreview = document.getElementById('image-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const promptAssistantBtn = document.getElementById('prompt-assistant-btn');
    const promptSuggestionsBox = document.getElementById('prompt-suggestions-box');
    const promptSuggestionsList = document.getElementById('prompt-suggestions-list');
    const refreshSuggestionsBtn = document.getElementById('refresh-suggestions');
    const generatePromptsBtn = document.getElementById('generate-prompts');
    const promptIdeaInput = document.getElementById('prompt-idea');
    const styleSelect = document.getElementById('style-select');
    const moodSelect = document.getElementById('mood-select');
    const aiPromptsResult = document.getElementById('ai-prompts-result');
    const aiPromptsList = document.getElementById('ai-prompts-list');
    const settingsPanelContainer = document.getElementById('settings-panel-container');
    const settingsPanelOverlay = document.getElementById('settings-panel-overlay');
    const toggleMenuBtn = document.getElementById('toggle-menu');
    const menuLinks = document.getElementById('menu-links');
    const toggleToolsBtn = document.getElementById('toggle-tools');
    const toolsLinks = document.getElementById('tools-links');
    const toggleSettingsBtn = document.getElementById('toggle-settings');
    const settingsLinks = document.getElementById('settings-links');
    const toggleSupportBtn = document.getElementById('toggle-support');
    const supportLinks = document.getElementById('support-links');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatView = document.getElementById('chat-view');
    const chatContainer = document.getElementById('chat-container');
    const typingIndicator = document.getElementById('typing-indicator');
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxClose = document.getElementById('lightbox-close');
    const searchIconButton = document.getElementById('search-icon-btn');
    const mainSearchInput = document.getElementById('main-search-input');
    const searchResultsContainer = document.getElementById('search-results-container');
    const imageStrengthSlider = document.getElementById('image-strength-slider');
    const imageStrengthValue = document.getElementById('image-strength-value');
    // ==================== APP STATE ====================
    let state = {
        isLoggedIn: false,
        isPro: false,
        userName: "Guest User",
        credits: 4,
        maxCredits: 4,
        myImages: [],
        likedImages: [],
        promptHistory: [],
        activePage: 'text-to-image',
        numImages: 1,
        guidanceImage: null,
        selectedAspectRatio: '1:1',
        selectedStyle: '#none',
        selectedLighting: '#none',
        selectedCamera: '#none',
        enhancePrompt: false,
        imageStrength: 0.35,
        currentTheme: 'dark'
    };

    // ==================== PROMPT SUGGESTIONS (SAMPLE DATA) ====================
    const promptSuggestions = [
        "A majestic dragon soaring over a medieval castle at sunset, digital art",
        "Cyberpunk street market with neon signs and diverse aliens, detailed",
        "Portrait of a steampunk inventor with intricate goggles and brass gadgets",
        "Underwater city with glass domes and glowing sea creatures, fantasy",
        "Futuristic library with floating books and holographic displays",
    ];

    // ==================== CORE FUNCTIONS ====================
    function switchPage(pageId) {
        state.activePage = pageId;
        allPages.forEach(page => page.classList.add('hidden'));
        const currentPage = document.getElementById(`page-${pageId}`);
        if (currentPage) {
            currentPage.classList.remove('hidden');
        }

        document.querySelectorAll('.sidebar-link.active').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.sidebar-link[data-page="${pageId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        if (window.innerWidth < 768) {
            sidebar.classList.add('-translate-x-full');
            if (sidebarOverlay) sidebarOverlay.style.display = 'none';
        }
        if (accountDropdown) {
            accountDropdown.classList.add('hidden');
        }
    }
    function updateSettingsDisplay() {
        // Helper function to find the image URL for a selected value
        function findOptionImage(panelKey, selectedValue) {
            if (!panelData[panelKey] || !selectedValue || selectedValue === '#none') {
                return null; // 'none' ya invalid ke liye image nahi
            }
            const valueName = selectedValue.startsWith('#') ? selectedValue.substring(1) : selectedValue;
            const options = panelData[panelKey].options || [];
            const option = options.find(opt => opt.name === valueName);
            return option ? option.img : null; // Image path return karo ya null
        }

        // Helper function to update the element with image + text
        function updateElementWithImage(elementId, panelKey, selectedValue) {
            const element = document.getElementById(elementId);
            if (!element) return;

            const imageUrl = findOptionImage(panelKey, selectedValue);

            if (imageUrl) {
                // Agar image mili, toh image + text dikhao
                element.innerHTML = `
                <img src="${imageUrl}" alt="${selectedValue}" class="w-5 h-5 inline-block mr-1 rounded-sm object-cover border border-[var(--border-color)]"> 
                <span class="align-middle">${selectedValue}</span>
            `;
            } else {
                // Agar image nahi mili ('#none' ya error), toh sirf text dikhao
                element.textContent = selectedValue;
            }
        }

        // Update each setting display
        updateElementWithImage('selected-style', 'styles-panel', state.selectedStyle);
        updateElementWithImage('selected-lighting', 'lighting-panel', state.selectedLighting);
        updateElementWithImage('selected-camera', 'camera-panel', state.selectedCamera);

        // Aspect Ratio ko pehle jaisa hi rakhein (kyunki uske liye shape hai, image nahi)
        const aspectRatioElement = document.getElementById('selected-aspect-ratio');
        if (aspectRatioElement) {
            aspectRatioElement.textContent = state.selectedAspectRatio;
            // Optionally, update the small square icon next to it if needed
            const aspectIconContainer = document.getElementById('selected-aspect-ratio-container');
            if (aspectIconContainer) {
                const iconDiv = aspectIconContainer.querySelector('div');
                if (iconDiv) {
                    // Adjust icon style based on selected aspect ratio if desired
                    // Example: iconDiv.style.aspectRatio = state.selectedAspectRatio.replace(':', '/');
                }
            }
        }
    }
    function renderUI() {
        if (userNameEl) userNameEl.textContent = state.userName;
        if (dropdownUsername) dropdownUsername.textContent = state.userName;
        if (creditCounter) {
            creditCounter.innerHTML = `Credits: ${state.isPro ? '<span class="animated-unlimited">Unlimited</span>' : state.credits}`;
        }

        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome to RitHan AI, ${state.userName}!`;
        }

        if (loggedInView) loggedInView.classList.toggle('hidden', !state.isLoggedIn);
        if (loggedOutView) loggedOutView.classList.toggle('hidden', state.isLoggedIn);
        if (generateBtn) {
            generateBtn.disabled = !state.isPro && state.credits < state.numImages;
            generateBtn.textContent = generateBtn.disabled ? 'No Credits' : 'Generate ✨';
        }
        renderGalleries();
        renderHistory();
        updateSettingsDisplay();
        renderSubscriptionPage(); // Yeh line add karni hai
    }

    function createImageCard(image) {
    // Stricter check: Ensure image is an object and has required properties
    if (typeof image !== 'object' || image === null || 
        typeof image.id === 'undefined' || image.id === null || 
        typeof image.src !== 'string' || typeof image.prompt !== 'string') 
    {
        console.error("Invalid or incomplete image data passed to createImageCard:", image);
        // Return NULL instead of an empty div
        return null; 
    }

    try {
        const isLiked = state.likedImages.some(likedImg => likedImg && likedImg.id === image.id);
        const item = document.createElement('div');
        item.className = 'gallery-item relative rounded-lg overflow-hidden cursor-pointer group';
        // Escape alt text and data-prompt just in case
        const safePrompt = image.prompt.replace(/"/g, '&quot;'); 
        item.innerHTML = `
        <img src="${image.src}" alt="${safePrompt}" class="w-full h-full object-cover aspect-[3/4] transition-transform duration-300 group-hover:scale-105 bg-[var(--bg-card)]" onerror="this.src='https://placehold.co/300x400/1A202C/C5C6C7?text=Load+Error'; this.onerror=null;">
        <div class="overlay absolute inset-0 bg-black/70 p-2 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <p class="text-white text-xs font-medium overflow-hidden text-ellipsis line-clamp-3">${image.prompt}</p>
            <div class="flex items-center justify-between gap-1">
                <button class="like-btn p-1.5 bg-white/20 rounded-full hover:bg-white/40 ${isLiked ? 'text-red-500' : 'text-white'}" data-id="${image.id}">
                    <svg class="like-icon w-4 h-4 pointer-events-none" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    <svg class="like-spinner hidden w-4 h-4 animate-spin pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                         <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </button>
                <button class="delete-image-btn p-1.5 bg-white/20 rounded-full text-red-500 hover:bg-white/40 hover:text-red-700" data-image-id="${image.id}" title="Delete Image">
                     <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
                <div class="flex-grow"></div> 
                <button class="copy-prompt-btn text-xs bg-white/20 text-white px-2 py-1 rounded-md hover:bg-white/40" data-prompt="${safePrompt}">Copy</button>
            </div>
        </div>`;

        // Add event listeners
        const likeBtn = item.querySelector('.like-btn');
        if (likeBtn) {
             likeBtn.addEventListener('click', (e) => { e.stopPropagation(); handleLike(image, e.currentTarget); });
        }
        const copyBtn = item.querySelector('.copy-prompt-btn');
        if (copyBtn) {
             copyBtn.addEventListener('click', (e) => { e.stopPropagation(); handleCopy(e.target, image.prompt); });
        }
        const deleteBtn = item.querySelector('.delete-image-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); handleDeleteImage(image.id); }); // Pass ID directly
        }

        item.addEventListener('click', () => openLightbox(image.src));

        return item; // Should be a valid Node

    } catch (innerError) {
         console.error("Error occurred INSIDE createImageCard for image:", image, innerError);
         return null; // Return null if any error happens during creation
    }
}


    async function handleDeleteImage(imageId) {
        if (!imageId) return;

        // Confirm with the user
        if (!confirm("Are you sure you want to delete this image? This cannot be undone.")) {
            return;
        }

        try {
            // Send DELETE request to the backend
            // NOTE: We use the existing admin route, but the backend logic needs adjustment
            const response = await fetch(`/api/admin/images/${imageId}`, { // Using existing admin route
                method: 'DELETE',
                credentials: 'include' // Important for authentication
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: 'Failed to delete image.' }));
                 // Check for specific permission error if backend sends one
                 if (response.status === 403) { 
                      throw new Error(errorData.error || "You don't have permission to delete this image.");
                 }
                 throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            // Remove item from the frontend state (My Images AND Liked Images)
            state.myImages = state.myImages.filter(item => item && item.id !== parseInt(imageId));
            state.likedImages = state.likedImages.filter(item => item && item.id !== parseInt(imageId)); 

            // Re-render the galleries
            renderGalleries(); 

            // Show success message (optional)
            Toastify({ text: "Image deleted successfully.", duration: 3000, style: { background: "linear-gradient(to right, #22c55e, #15803d)" } }).showToast();

        } catch (error) {
            console.error("Error deleting image:", error);
            showError(`Could not delete image: ${error.message}`);
        }
    }
    function renderSubscriptionPage() {
        const guestView = document.getElementById('subscription-guest');
        const freeView = document.getElementById('subscription-free');
        const proView = document.getElementById('subscription-pro');
        const freeCreditsEl = document.getElementById('free-credits-count');

        if (!guestView || !freeView || !proView) return;

        // Sabko hide karo
        guestView.classList.add('hidden');
        freeView.classList.add('hidden');
        proView.classList.add('hidden');

        if (!state.isLoggedIn) {
            // Agar user logged in nahi hai
            guestView.classList.remove('hidden');
        } else if (state.isPro) {
            // Agar user Pro hai
            proView.classList.remove('hidden');
        } else {
            // Agar user logged in hai but Free hai
            if (freeCreditsEl) freeCreditsEl.textContent = state.credits;
            freeView.classList.remove('hidden');
        }
    }
function renderGalleries() {
    // My Images Gallery
    if (myImagesGalleryContainer) {
        myImagesGalleryContainer.innerHTML = ''; // Clear previous items
        const emptyEl = document.getElementById('my-images-empty');
        if (emptyEl) emptyEl.classList.toggle('hidden', state.myImages.length === 0);

        state.myImages.forEach(img => {
            const card = createImageCard(img); // Create card (might return null)
            if (card instanceof Node) { // Check if it's a valid DOM Node
                 try {
                     myImagesGalleryContainer.appendChild(card); // Append only if valid
                 } catch (appendError) {
                      console.error("Error appending card to myImagesGalleryContainer:", appendError, "Card:", card, "Image Data:", img);
                 }
            } else {
                 // Log if createImageCard returned null or invalid type
                 console.warn("Skipped appending invalid/null card returned by createImageCard for myImages:", img);
            }
        });
    }

    // Liked Images Gallery
    if (likedImagesGalleryContainer) {
        likedImagesGalleryContainer.innerHTML = ''; // Clear previous items
        const emptyEl = document.getElementById('liked-images-empty');
        if (emptyEl) emptyEl.classList.toggle('hidden', state.likedImages.length === 0);

        state.likedImages.forEach(img => {
            const card = createImageCard(img); // Create card (might return null)
            if (card instanceof Node) { // Check if it's a valid DOM Node
                 try {
                      likedImagesGalleryContainer.appendChild(card); // Append only if valid
                 } catch (appendError) {
                      console.error("Error appending card to likedImagesGalleryContainer:", appendError, "Card:", card, "Image Data:", img);
                 }
            } else {
                 // Log if createImageCard returned null or invalid type
                 console.warn("Skipped appending invalid/null card returned by createImageCard for likedImages:", img);
            }
        });
    }
}
    function renderHistory() {
        if (historyContainer) {
            historyContainer.innerHTML = ''; // Clear existing items
            const emptyEl = document.getElementById('history-empty');
            if (emptyEl) emptyEl.classList.toggle('hidden', state.promptHistory.length > 0);

            // Create a copy and reverse it to show newest first
            const reversedHistory = [...state.promptHistory].reverse();

            reversedHistory.forEach((historyItem, index) => {
                // Assuming historyItem might be just a string OR an object {id: ..., prompt: ...}
                // We need an ID to delete. If only strings exist, we might need backend changes first.
                // For now, let's assume historyItem is an object like {id: 123, prompt: "a cat"}
                // If it's just a string, this delete button won't work without backend changes.

                if (!historyItem || typeof historyItem.prompt === 'undefined' || typeof historyItem.id === 'undefined') {
                    // If data format is wrong (e.g., just strings), skip or show differently
                    console.warn("Skipping history item due to unexpected format:", historyItem);
                    // You could try to display the string anyway if it's just text
                    if (typeof historyItem === 'string') {
                        const item = document.createElement('div');
                        item.className = 'bg-[var(--bg-sidebar)] p-3 rounded-lg flex justify-between items-center opacity-50'; // Make it look disabled
                        item.innerHTML = `<p class="text-gray-400 truncate pr-4 italic">${historyItem} (Cannot delete)</p>`;
                        historyContainer.appendChild(item);
                    }
                    return;
                }

                const item = document.createElement('div');
                item.className = 'bg-[var(--bg-sidebar)] p-3 rounded-lg flex justify-between items-center gap-2'; // Added gap
                item.innerHTML = `
                <p class="text-[var(--text-primary)] truncate flex-1" title="${historyItem.prompt}">${historyItem.prompt}</p>
                <div class="flex-shrink-0 flex gap-2">
                     <button class="reuse-prompt-btn text-xs bg-[var(--accent-primary)] text-black px-3 py-1 rounded-md font-semibold" 
                            data-prompt="${historyItem.prompt}">Reuse</button>
                     <button class="delete-history-btn text-xs bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700" 
                            data-history-id="${historyItem.id}" title="Delete this prompt">
                            <svg class="w-3 h-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                     </button>
                </div>
            `;

                // Reuse button listener (as before)
                item.querySelector('.reuse-prompt-btn').addEventListener('click', () => {
                    if (promptInput) {
                        promptInput.value = historyItem.prompt;
                        switchPage('text-to-image');
                        promptInput.focus();
                    }
                });

                // --- NEW: Delete button listener ---
                item.querySelector('.delete-history-btn').addEventListener('click', (e) => {
                    const historyIdToDelete = e.currentTarget.dataset.historyId;
                    handleDeleteHistoryItem(historyIdToDelete);
                });
                // --- END NEW ---

                historyContainer.appendChild(item);
            });
        }
    }
    async function handleDeleteHistoryItem(historyId) {
        if (!historyId) return;

        // Confirm with the user
        if (!confirm("Are you sure you want to delete this prompt from your history?")) {
            return;
        }

        try {
            // Send DELETE request to the backend
            const response = await fetch(`/api/history/${historyId}`, {
                method: 'DELETE',
                credentials: 'include' // Important for authentication
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to delete history item.' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            // Remove item from the frontend state
            state.promptHistory = state.promptHistory.filter(item => item && item.id !== parseInt(historyId)); // Ensure ID comparison is correct (string vs number)

            // Re-render the history list
            renderHistory();

            // Show success message (optional)
            Toastify({ text: "History item deleted.", duration: 3000, style: { background: "linear-gradient(to right, #22c55e, #15803d)" } }).showToast();

        } catch (error) {
            console.error("Error deleting history item:", error);
            showError(`Could not delete history item: ${error.message}`);
        }
    }
    function renderPromptSuggestions() {
        if (!promptSuggestionsList) return;
        promptSuggestionsList.innerHTML = '';
        const selected = [...promptSuggestions].sort(() => 0.5 - Math.random()).slice(0, 5);
        selected.forEach(prompt => {
            const div = document.createElement('div');
            div.className = 'prompt-suggestion p-2 rounded-md bg-[var(--bg-dark)] border border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-card)]';
            div.innerHTML = `<p class="text-sm">${prompt}</p>`;
            div.addEventListener('click', () => {
                if (promptInput) {
                    promptInput.value = prompt;
                    if (promptSuggestionsBox) promptSuggestionsBox.classList.add('hidden');
                }
            });
            promptSuggestionsList.appendChild(div);
        });
    }
    async function handleLogout() {
        try {
            // Backend ko logout request bhejein
            await fetch('/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {
            // Agar request fail bhi ho, to client-side logout poora karein
            console.warn('Logout request failed, proceeding with client-side logout.', e);
        } finally {
            // Client-side state ko guest user jaisa reset karein
            state.isLoggedIn = false;
            state.userName = "Guest User";
            state.credits = 4;
            state.isPro = false;
            state.myImages = [];
            state.likedImages = [];
            state.promptHistory = [];

            // UI ko update karein aur user ko homepage par bhej dein
            renderUI();
            window.location.href = 'index.html';
        }
    }
    function generateAIPrompts() {
        if (!promptIdeaInput) return;

        const idea = promptIdeaInput.value.trim();
        const style = styleSelect ? styleSelect.value : 'any';
        const mood = moodSelect ? moodSelect.value : 'any';

        if (!idea) {
            showError('Please describe what kind of image you want to create');
            return;
        }

        if (aiPromptsResult) aiPromptsResult.classList.add('hidden');
        if (generatePromptsBtn) {
            generatePromptsBtn.disabled = true;
            generatePromptsBtn.textContent = 'Generating...';
        }

        setTimeout(() => {
            if (aiPromptsList) aiPromptsList.innerHTML = '';

            const styleText = style !== 'any' ? `${style} style` : '';
            const moodText = mood !== 'any' ? `, ${mood} mood` : '';

            const prompts = [
                `${idea}, ${styleText}${moodText}, highly detailed, masterpiece`,
                `${idea} in a ${style} setting${moodText}, dramatic lighting, intricate details`,
                `A ${mood} interpretation of ${idea}, rendered in ${style} style, professional artwork`
            ];

            prompts.forEach(prompt => {
                const div = document.createElement('div');
                div.className = 'p-3 bg-[var(--bg-dark)] rounded-lg border border-[var(--border-color)]';
                div.innerHTML = `
                    <p class="text-sm">${prompt}</p>
                    <div class="mt-2 flex justify-end">
                        <button class="copy-ai-prompt text-xs bg-[var(--accent-primary)] text-black px-2 py-1 rounded mr-2">Copy</button>
                        <button class="use-ai-prompt text-xs bg-[var(--accent-primary)] text-black px-2 py-1 rounded">Use & Generate</button>
                    </div>
                `;

                const copyBtn = div.querySelector('.copy-ai-prompt');
                const useBtn = div.querySelector('.use-ai-prompt');

                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(prompt);
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy';
                        }, 2000);
                    });
                }

                if (useBtn) {
                    useBtn.addEventListener('click', () => {
                        if (promptInput) {
                            promptInput.value = prompt;
                            switchPage('text-to-image');
                            promptInput.focus();
                        }
                    });
                }

                if (aiPromptsList) aiPromptsList.appendChild(div);
            });

            if (aiPromptsResult) aiPromptsResult.classList.remove('hidden');
            if (generatePromptsBtn) {
                generatePromptsBtn.disabled = false;
                generatePromptsBtn.textContent = 'Generate Prompt Ideas';
            }
        }, 1500);
    }

    function handleLike(image, buttonElement = null) {
        // Agar buttonElement nahi mila (shayad gallery se call hua), toh kuch na karein
        // Note: Gallery update ke liye alag logic lagega agar wahan bhi spinner chahiye
        if (!buttonElement) {
            console.warn("handleLike called without buttonElement. Spinner won't work for this call.");
            // Fallback to old behavior without spinner for safety
            if (state.isLoggedIn) {
                fetch('/api/images/like', { /* ... credentials ... */ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_id: image.id }) })
                    .then(res => res.json()).then(data => { if (data.status === 'success') { /* state update */ const index = state.likedImages.findIndex(likedImg => likedImg && likedImg.id === image.id); if (data.liked && index === -1) { state.likedImages.push(image); } else if (!data.liked && index > -1) { state.likedImages.splice(index, 1); } renderGalleries(); } })
                    .catch(err => console.error("Like error:", err));
            } else { /* guest logic */ const index = state.likedImages.findIndex(likedImg => likedImg && likedImg.id === image.id); if (index > -1) { state.likedImages.splice(index, 1); } else { state.likedImages.push(image); } renderGalleries(); saveGuestSession(); }
            return;
        }

        const likeIcon = buttonElement.querySelector('.like-icon');
        const likeSpinner = buttonElement.querySelector('.like-spinner');

        // --- Start Loading ---
        buttonElement.disabled = true; // Button ko disable karein
        if (likeIcon) likeIcon.classList.add('hidden'); // Icon hide karein
        if (likeSpinner) likeSpinner.classList.remove('hidden'); // Spinner show karein
        // --- End Start Loading ---

        // Function to stop loading and update button UI
        const stopLoadingAndUpdateUI = () => {
            const isLikedNow = state.likedImages.some(likedImg => likedImg && likedImg.id === image.id);

            // Update button visual state
            buttonElement.classList.toggle('text-red-500', isLikedNow);
            if (likeIcon) {
                // Heart icon ko target karein (jo ab like-icon class ke saath hai)
                likeIcon.setAttribute('fill', isLikedNow ? 'currentColor' : 'none');
            }

            // --- Stop Loading ---
            buttonElement.disabled = false; // Button ko enable karein
            if (likeIcon) likeIcon.classList.remove('hidden'); // Icon show karein
            if (likeSpinner) likeSpinner.classList.add('hidden'); // Spinner hide karein
            // --- End Stop Loading ---
        };

        // API Call Logic (Logged-in user)
        if (state.isLoggedIn) {
            fetch('/api/images/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_id: image.id }),
                credentials: 'include'
            })
                .then(res => {
                    if (!res.ok) { // Check karein ki response ok hai ya nahi
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        // Update state
                        const index = state.likedImages.findIndex(likedImg => likedImg && likedImg.id === image.id);
                        if (data.liked && index === -1) {
                            state.likedImages.push(image);
                        } else if (!data.liked && index > -1) {
                            state.likedImages.splice(index, 1);
                        }
                        renderGalleries(); // Gallery update karein (optional, agar turant update chahiye)
                    } else {
                        throw new Error(data.error || 'Like toggle failed');
                    }
                })
                .catch(err => {
                    console.error("Like error:", err);
                    showError(`Failed to update like status: ${err.message}`); // User ko error dikhayein
                    // Error hone par button ko purani state mein wapas laayein (optional)
                    // Hum yahan UI ko current state ke hisaab se update kar rahe hain
                })
                .finally(() => {
                    // API call complete hone ke baad (success ya error), loading band karein
                    stopLoadingAndUpdateUI();
                });
        }
        // Guest User Logic
        else {
            const index = state.likedImages.findIndex(likedImg => likedImg && likedImg.id === image.id);
            if (index > -1) {
                state.likedImages.splice(index, 1);
            } else {
                state.likedImages.push(image);
            }
            renderGalleries(); // Gallery update
            saveGuestSession(); // Guest session save
            stopLoadingAndUpdateUI(); // Loading turant band karein
        }
    }
    function handleCopy(button, prompt) {
        navigator.clipboard.writeText(prompt).then(() => {
            button.textContent = 'Copied!';
            setTimeout(() => { button.textContent = 'Copy'; }, 2000);
        }).catch(err => console.error('Failed to copy: ', err));
    }

    async function handleImageGeneration() {
        if (!promptInput || !chatContainer) return;

        const userPrompt = promptInput.value.trim();
        if (!userPrompt) {
            showError('Please enter a prompt.');
            return;
        }

        if (welcomeScreen && welcomeScreen.style.display !== 'none') {
            welcomeScreen.style.display = 'none';
            chatView.style.display = 'flex';
            chatView.style.flexDirection = 'column';
            chatView.style.height = '100%';
        }

        // Yeh check karega ki credits hain ya nahi
        if (!state.isPro && state.credits < state.numImages) {
            showError(`Not enough credits. You need ${state.numImages} credits to generate.`);
            return;
        }

        const generationSettings = {
            prompt: userPrompt,
            numImages: state.numImages,
            aspectRatio: state.selectedAspectRatio,
            style: state.selectedStyle,
            lighting: state.selectedLighting,
            camera: state.selectedCamera,
            enhancePrompt: state.enhancePrompt,
            guidanceImage: state.guidanceImage, // Yeh line pehle se hogi
            imageStrength: state.imageStrength, // <-- YEH NAYI LINE ADD KAREIN // Yeh line add karein
            guidanceImage: state.guidanceImage // Yeh line add karein
        };

        addMessageToChat('user', userPrompt);
        promptInput.value = '';

        typingIndicator.classList.remove('hidden');
        chatContainer.scrollTop = chatContainer.scrollHeight;
        showLoading(true); // Loader show karein

        try {
            // YEH ASLI SERVER CALL HAI
            const response = await fetch("/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(generationSettings),
                credentials: 'include'
            });

            const data = await response.json();
            typingIndicator.classList.add('hidden');
            showLoading(false); // Loader hide karein

            if (!response.ok) {
                throw new Error(data.error || "Generation failed");
            }

            if (data.image_data_list && data.image_data_list.length > 0) {
                addMessageToChat('ai', { imageList: data.image_data_list });

                // Sabhi images ko 'My Images' gallery mein add karein (GUEST KE LIYE TEMP ID KE SAATH)
                data.image_data_list.forEach(imgObject => {
                    // Agar user guest hai aur image ka ID null/undefined hai, toh ek temp ID do
                    if (!state.isLoggedIn && (imgObject.id === null || typeof imgObject.id === 'undefined')) {
                        imgObject.id = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                        console.log("Assigned temporary guest ID:", imgObject.id); // Debugging ke liye
                    }
                    state.myImages.unshift(imgObject);
                });
            }
            // History update karein (OBJECT ke saath)
            // Pehle check karein ki yeh prompt pehle se hai ya nahi
            const alreadyExists = state.promptHistory.some(item => item && item.prompt === userPrompt);
            if (!alreadyExists) {
                // Naya object banayein. Logged-in user ke liye ID backend se aayegi (abhi null rakhein), 
                // Guest ke liye bhi null rakhein kyunki hum delete support nahi kar rahe
                const newHistoryItem = {
                    // ID ko abhi handle karna complex hai, isse backend se sync karna padega
                    // For now, let's keep it simple and maybe skip adding to state here,
                    // relying on fetchUserData to refresh after login.
                    // OR assign a temporary ID for potential client-side deletion (needs more logic)
                    id: `temp_${Date.now()}`, // Temporary ID, won't match backend
                    prompt: userPrompt
                };
                // state.promptHistory.unshift(newHistoryItem); // Add to beginning (optional)

                // === BETTER APPROACH FOR NOW ===
                // Don't add directly to state here. Rely on fetching history from backend after login.
                // For guests, history might not persist reliably across sessions anyway.
                // If you NEED instant update, you have to decide how to handle IDs.
            }

            // === CREDIT DEBUG LOGS START ===
            console.log("Current state.credits BEFORE update:", state.credits);
            if (data.new_credits !== undefined) {
                console.log("Received new_credits FROM BACKEND:", data.new_credits); // Log 1: Backend se kya aaya?
                state.credits = data.new_credits;
                console.log("Current state.credits AFTER update:", state.credits); // Log 2: State update hua ya nahi?
            } else {
                console.log("Backend did NOT return new_credits field.");
            }
            // === CREDIT DEBUG LOGS END ===

            renderGalleries();
            renderHistory();
            renderUI(); // UI update karein
            saveGuestSession(); // Guest session save karein (Ab yeh updated value save karega)

        } catch (error) {
            typingIndicator.classList.add('hidden');
            showLoading(false); // Loader hide karein
            addMessageToChat('ai', { text: `Sorry, an error occurred: ${error.message}` });
            showError(error.message); // Error message dikhayein
        }
    }

    function addMessageToChat(sender, content) {
        if (!chatContainer) return;
        const messageWrapper = document.createElement('div');
        messageWrapper.className = sender === 'user' ? 'user-message' : 'ai-message';
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';

        if (sender === 'user') {
            messageBubble.textContent = content;
        } else { // AI Message
            const imageList = content.imageList || [];
            const textContent = content.text || "";

            if (imageList.length > 0) {
                if (imageList.length > 1) {
                    // === GRID LAYOUT ===
                    messageBubble.classList.add('ai-image-grid');
                    let gridHTML = '';
                    imageList.forEach(imgData => {
                        const imgDataString = JSON.stringify(imgData).replace(/'/g, "&apos;");
                        const isLiked = state.likedImages.some(img => img && img.id === imgData.id); // <--- 
                        gridHTML += `
                        <div class="grid-image-item" data-src="${imgData.src}" data-image-info='${imgDataString}'>
                            <img src="${imgData.src}" alt="${imgData.prompt}">
                            <div class="grid-image-overlay">
                                <button title="Like" class="action-btn like-btn">
                                <svg class="pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></button>
                                <svg class="like-icon w-4 h-4 pointer-events-none" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>

<svg class="like-spinner hidden w-4 h-4 animate-spin pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
     <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
     <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
</svg>
                                <button title="Download" class="action-btn download-btn"><svg class="pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button>
                                <button title="Share" class="action-btn share-btn"><svg class="pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.367a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path></svg></button>
                            </div>
                        </div>
                    `;
                    });
                    messageBubble.innerHTML = gridHTML;

                    messageBubble.querySelectorAll('.grid-image-item').forEach(item => {
                        const src = item.dataset.src;
                        const imgInfo = JSON.parse(item.dataset.imageInfo);
                        item.addEventListener('click', () => openLightbox(src)); // open preview
                        item.querySelector('.like-btn').addEventListener('click', (e) => { e.stopPropagation(); handleLike(imgInfo, e.currentTarget); }); item.querySelector('.download-btn').addEventListener('click', async (e) => { e.stopPropagation(); try { const response = await fetch(src); const blob = await response.blob(); const localUrl = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = localUrl; link.download = `rithan-ai-${Date.now()}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(localUrl); } catch (error) { alert('Download failed.'); } });
                        item.querySelector('.share-btn').addEventListener('click', (e) => { e.stopPropagation(); if (navigator.share) { navigator.share({ title: 'AI Image from RitHan AI', text: `Prompt: ${imgInfo.prompt}`, url: window.location.href }); } });
                    });

                } else if (imageList.length === 1) {
                    // === SINGLE IMAGE LAYOUT ===
                    const singleImage = imageList[0];
                    const isLiked = state.likedImages.some(img => img && img.id === singleImage.id);
                    messageBubble.innerHTML = `
                    <img src="${singleImage.src}" alt="${singleImage.prompt}" class="rounded-t-lg cursor-pointer">
                    <div class="image-actions-container">
                        <button title="Like" class="action-btn like-btn ${isLiked ? 'text-red-500' : ''}"><svg class="pointer-events-none" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></button>
                        <button title="Copy Prompt" class="action-btn copy-btn"><svg class="pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg></button>
                        <button title="Download" class="action-btn download-btn"><svg class="pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button>
                        <button title="Share" class="action-btn share-btn"><svg class="pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.367a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path></svg></button>
                    </div>`;

                    messageBubble.querySelector('img').addEventListener('click', () => openLightbox(singleImage.src)); // open preview
                    messageBubble.querySelector('.like-btn').addEventListener('click', (e) => handleLike(singleImage, e.currentTarget)); messageBubble.querySelector('.download-btn').addEventListener('click', async () => { try { const response = await fetch(singleImage.src); const blob = await response.blob(); const localUrl = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = localUrl; link.download = `rithan-ai-${Date.now()}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(localUrl); } catch (error) { alert('Download failed.'); } });
                    messageBubble.querySelector('.share-btn').addEventListener('click', () => { if (navigator.share) { navigator.share({ title: 'AI Image from RitHan AI', text: `Prompt: ${singleImage.prompt}`, url: window.location.href }); } });
                    const copyBtn = messageBubble.querySelector('.copy-btn'); copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(singleImage.prompt); copyBtn.innerHTML = `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>`; setTimeout(() => { copyBtn.innerHTML = `<svg class="pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>`; }, 2000); });
                }
            } else if (textContent) {
                // Sirf text message (error message ke liye)
                messageBubble.textContent = textContent;
                messageBubble.style.backgroundColor = 'var(--bg-card)';
                messageBubble.style.color = 'var(--text-primary)';
                messageBubble.style.padding = '12px 18px';
                messageBubble.style.borderRadius = '20px 20px 20px 5px';
            }
        }
        messageWrapper.appendChild(messageBubble);
        chatContainer.appendChild(messageWrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    function setTheme(theme) {
        document.documentElement.className = theme === 'light' ? 'light-mode' : 'dark-mode';
        localStorage.setItem('colorMode', theme);
        if (lightThemeBtn) lightThemeBtn.classList.toggle('bg-gray-700', theme !== 'light');
        if (darkThemeBtn) darkThemeBtn.classList.toggle('bg-gray-700', theme === 'light');
    }

    function showLoading(isLoading) {
        if (loaderContainer) loaderContainer.style.display = isLoading ? 'flex' : 'none';
        if (generateBtn) generateBtn.disabled = isLoading;
    }

    function showError(message) {
        if (typeof Toastify === "undefined") { // Library load hui ya nahi check karein
            console.error("Toastify not loaded. Error:", message);
            if (errorContainer) { // Fallback to old method
                errorContainer.textContent = `Error: ${message}`;
                errorContainer.style.display = 'block';
                setTimeout(() => { errorContainer.style.display = 'none'; }, 5000);
            }
            return;
        }
        Toastify({
            text: `⚠️ ${message}`,
            duration: 5000, // 5 seconds
            close: true,
            gravity: "top", // `top` ya `bottom`
            position: "right", // `left`, `center` ya `right`
            stopOnFocus: true, // Prevents dismissing of toast on hover
            style: {
                background: "linear-gradient(to right, #ef4444, #b91c1c)", // Red gradient
                borderRadius: "8px",
            },
            onClick: function () { } // Callback after click
        }).showToast();
        // Optional: Purana error container abhi bhi use karna hai toh usey rehne dein
        // if (errorContainer) errorContainer.style.display = 'none'; 
    }
    // Is function ko Dashboard.js mein replace karein
    // Is function ko Dashboard.js mein replace karein
    function saveGuestSession() {
        if (!state.isLoggedIn) {
            try {
                // Ensure credits is a valid number before saving
                const creditsToSave = (typeof state.credits === 'number' && !isNaN(state.credits)) ? state.credits : 4; // Fallback to 4 if invalid

                const guestData = {
                    credits: creditsToSave, // Save only the validated number
                    myImages: state.myImages,
                    promptHistory: state.promptHistory,
                    likedImages: state.likedImages
                };

                // Log what is being saved
                console.log("Saving guest credits to localStorage:", creditsToSave);

                localStorage.setItem('guestSession', JSON.stringify(guestData));

                // Optional: Verify what was actually saved
                // const savedData = JSON.parse(localStorage.getItem('guestSession'));
                // console.log("Value read back from localStorage:", savedData ? savedData.credits : 'Error reading back');

            } catch (e) {
                console.error("Could not save guest session:", e);
                showError("Could not save your session data."); // Inform user
            }
        } else {
            // If user is logged in, clear any old guest session
            // console.log("User logged in, removing guest session from localStorage.");
            localStorage.removeItem('guestSession');
        }
    }

    // Isse replace karein extra.js mein
function loadGuestSession() {
    try {
        const guestDataString = localStorage.getItem('guestSession');
        // console.log("Loading guest session string:", guestDataString); // Optional log
        if (guestDataString) {
            const guestData = JSON.parse(guestDataString);
            // console.log("Parsed guest data:", guestData); // Optional log

            // Load credits safely
            if (guestData.credits !== undefined && typeof guestData.credits === 'number' && !isNaN(guestData.credits)) {
                 state.credits = guestData.credits;
            } else {
                 state.credits = 4; // Reset agar invalid data hai
                 console.warn("Invalid guest credits found in storage, reset to 4");
            }

            // Load myImages and assign temp IDs if needed
            state.myImages = Array.isArray(guestData.myImages) ? guestData.myImages.map((img, index) => {
                // Check karo: image valid hai, aur ID ya toh null/undefined hai YA 'guest_' se shuru nahi hota (purana format)
                if (img && (img.id === null || typeof img.id === 'undefined' || (typeof img.id === 'string' && !img.id.startsWith('guest_')))) {
                     // ID ko unique banao (Date + index + random string)
                     img.id = `guest_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`;
                     console.log("Assigned temporary ID during load:", img.id); // Debugging
                }
                // Agar image valid nahi hai (e.g., null entry in array), toh skip karo
                return img ? img : null; 
            }).filter(img => img !== null) : []; // Filter out null entries

            state.promptHistory = Array.isArray(guestData.promptHistory) ? guestData.promptHistory.map((item, index) => {
                 // History ko bhi object format mein convert karein agar woh string hai
                 if (typeof item === 'string') {
                      return { id: `hist_guest_${Date.now()}_${index}`, prompt: item }; // Assign temp ID
                 } else if (item && typeof item.prompt !== 'undefined' && (item.id === null || typeof item.id === 'undefined')) {
                      item.id = `hist_guest_${Date.now()}_${index}`; // Assign temp ID agar object hai par ID nahi
                      return item;
                 }
                 return item; // Agar pehle se object hai ID ke saath
            }).filter(item => item && item.id && item.prompt) : []; // Ensure valid items

            // Load likedImages safely
            const validMyImageIds = new Set(state.myImages.map(img => img.id)); // Get all valid IDs from myImages
            state.likedImages = Array.isArray(guestData.likedImages) ? guestData.likedImages.filter(likedImg => 
                likedImg && likedImg.id && validMyImageIds.has(likedImg.id) // Sirf woh liked rakho jinki corresponding image myImages mein hai
            ) : [];

        } else {
             // console.log("No guest session found. Setting defaults."); // Optional log
             // Reset state agar koi session nahi mila
             state.credits = 4; 
             state.myImages = [];
             state.promptHistory = [];
             state.likedImages = [];
        }
    } catch (e) {
        console.error("Could not load/parse guest session:", e);
        // Error hone par state reset karo aur user ko batao
        state.credits = 4;
        state.myImages = [];
        state.promptHistory = [];
        state.likedImages = [];
        showError("Could not load previous session data. Session reset."); 
        localStorage.removeItem('guestSession'); // Kharab data hata do
    }
    // Hamesha UI render karo taaki changes dikhein
    renderUI();
}
    async function fetchUserData() {
        if (!state.isLoggedIn) return; // Agar user logged in nahi hai to kuch na karein

        try {
            // Teeno API calls ek saath bhejenge
            const [imagesRes, historyRes, likesRes] = await Promise.all([
                fetch('/api/user/images', { credentials: 'include' }),
                fetch('/api/user/history', { credentials: 'include' }),
                fetch('/api/user/likes', { credentials: 'include' })
            ]);

            if (!imagesRes.ok || !historyRes.ok || !likesRes.ok) {
                // Ek bhi fail hua toh guest data load karke error dikhayein
                loadGuestSession(); // Guest data fallback
                throw new Error("Failed to fetch user data, loading local session.");
            }

            // Response se data nikal kar state update karenge
            state.myImages = await imagesRes.json();
            state.promptHistory = await historyRes.json();
            state.likedImages = await likesRes.json();

            // UI ko naye data ke saath refresh karenge
            renderUI();

        } catch (error) {
            console.error("Error fetching user data:", error);
            showError("Could not load your saved data.");
            // Error hone par local data load karein
            loadGuestSession();
            renderUI();
        }
    }
    function handleImageUpload(file) {
        if (!file.type.startsWith('image/')) { showError('Please select an image file.'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (imagePreview) { imagePreview.src = e.target.result; imagePreview.classList.remove('hidden'); }
            if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
            if (removeImageBtn) removeImageBtn.classList.remove('hidden');
            state.guidanceImage = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function removeUploadedImage() {
        if (imagePreview) { imagePreview.src = ''; imagePreview.classList.add('hidden'); }
        if (uploadPlaceholder) uploadPlaceholder.classList.remove('hidden');
        if (removeImageBtn) removeImageBtn.classList.add('hidden');
        if (imageUploadInput) imageUploadInput.value = '';
        state.guidanceImage = null;
    }

    function openLightbox(src) {
        if (lightboxOverlay && lightboxImage) { lightboxImage.src = src; lightboxOverlay.classList.remove('hidden'); }
    }

    // ==================== SETTINGS PANEL LOGIC (FULL VERSION + MOBILE FIX) ====================
    const panelData = {
        'aspect-ratio-panel': {
            title: 'Aspect Ratio',
            type: 'grid-3', // Yeh 'grid-3' hi rehne dein
            target: '#selected-aspect-ratio',
            options: [
                // Common Ratios
                { name: '1:1', aspect: '1:1', label: 'Square' },
                { name: '4:5', aspect: '4:5', label: 'Portrait' },
                { name: '3:2', aspect: '3:2', label: 'Landscape' },

                // Tall / Story Ratios
                { name: '9:16', aspect: '9:16', label: 'Story / Reel' },
                { name: '3:4', aspect: '3:4', label: 'Tall Post' },
                { name: '2:3', aspect: '2:3', label: 'Tall Photo' },

                // Wide / Cinematic Ratios
                { name: '16:9', aspect: '16:9', label: 'Widescreen' },
                { name: '4:3', aspect: '4:3', label: 'Standard' },
                { name: '21:9', aspect: '21:9', label: 'Ultrawide' },
            ]
        },
        'styles-panel': {
            title: 'Effects',
            type: 'grid-3',
            target: '#selected-style',
            prefix: '#',
            options: [
                // === YAHAN ASLI SVG CODE DAALEIN ===
                {
                    name: 'none',
                    // img: '/static/images/styles/none.png', // <-- Yeh line delete karein
                    iconSVG: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>', // <-- Yeh line add karein
                    // icon property (jo naam ke saath tha) optional hai, rakh sakte hain ya hata sakte hain
                    icon: '<svg class="w-4 h-4 mr-1 inline-block" ...></svg>' // Agar yeh tha toh hata dein ya update karein
                }, { name: '3D Render', img: 'images/styles/3d_render.jpeg', icon: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>' }, // Example Icon
                { name: 'Cartoon', img: '/images/styles/cartoon.jpg', icon: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path></svg>' }, // Example Icon
                // ... Baaki options ke liye bhi icon add karein ...
                { name: 'Comic', img: '/images/styles/comic.jpeg', icon: '' },
                { name: 'Japanese', img: '/images/styles/japanese.jpeg', icon: '' },
                { name: 'Watercolor', img: '/images/styles/watercolor.webp', icon: '' },
                { name: 'Illustration', img: '/images/styles/illustration.jpg', icon: '' },
                { name: 'Sketch', img: '/images/styles/sketch.jpg', icon: '' },
                { name: 'Cinematic', img: '/images/styles/cinematic.jpg', icon: '' },
                { name: 'Dark Sci-Fi', img: '/images/styles/dark_scifi.jpeg', icon: '' },
                { name: 'Retro', img: '/images/styles/retro.jpeg', icon: '' },
                { name: 'Pixel Art', img: '/images/styles/pixel_art.webp', icon: '' }
            ]
        },
        'lighting-panel': {
            title: 'Lighting',
            type: 'list',
            target: '#selected-lighting',
            prefix: '#',
            options: [
                // === YAHAN ASLI SVG CODE DAALEIN ===
                {
                    name: 'none',
                    // img: '/static/images/styles/none.png', // <-- Yeh line delete karein
                    iconSVG: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>', // <-- Yeh line add karein
                    // icon property (jo naam ke saath tha) optional hai, rakh sakte hain ya hata sakte hain
                    icon: '<svg class="w-4 h-4 mr-1 inline-block" ...></svg>' // Agar yeh tha toh hata dein ya update karein
                }, { name: 'Natural', img: '/images/lighting/natural.jpg', icon: '' },
                { name: 'Studio', img: '/images/lighting/studio.jpg', icon: '' },
                { name: 'Neon', img: '/images/lighting/neon.jpg', icon: '' },
                { name: 'Silhouette', img: '/images/lighting/silhouette.jpg', icon: '' },
                { name: 'Iridescent', img: '/images/lighting/iridescent.jpeg', icon: '' },
                { name: 'Dramatic', img: '/images/lighting/dramatic.png', icon: '' }
            ]
        },
        'camera-panel': {
            title: 'Camera',
            type: 'list',
            target: '#selected-camera',
            prefix: '#',
            options: [
                // === YAHAN ASLI SVG CODE DAALEIN ===
                {
                    name: 'none',
                    // img: '/static/images/styles/none.png', // <-- Yeh line delete karein
                    iconSVG: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>', // <-- Yeh line add karein
                    // icon property (jo naam ke saath tha) optional hai, rakh sakte hain ya hata sakte hain
                    icon: '<svg class="w-4 h-4 mr-1 inline-block" ...></svg>' // Agar yeh tha toh hata dein ya update karein
                }, { name: 'Portrait', img: '/images/camera/portrait.jpg', icon: '' },
                { name: 'Wide Shot', img: '/images/camera/wide_shot.webp', icon: '' },
                { name: 'Close-up', img: '/images/camera/close_up.webp', icon: '' },
                { name: 'Low Angle', img: '/images/camera/low_angle.webp', icon: '' },
                { name: 'Aerial View', img: '/images/camera/aerial_view.jpeg', icon: '' },
                { name: 'Ground View', img: '/images/camera/ground_view.jpg', icon: '' }
            ]
        }
    };

    // Add this variable at the top with your other variables
    // let isPanelTransitioning = false;

    function openSettingsPanel(panelId) {
        // Prevent opening a new panel while another is closing
        if (isPanelTransitioning) {
            return;
        }

        // Clear any pending close operation
        if (closePanelTimeout) {
            clearTimeout(closePanelTimeout);
            closePanelTimeout = null;
        }

        const data = panelData[panelId];
        if (!data || !settingsPanelContainer) return;
        let gridClass = data.type === 'grid-2' ? 'grid-cols-2 gap-4' : (data.type === 'grid-3' ? 'grid-cols-3 gap-2' : 'grid-cols-1 gap-2');

        // Yeh code Aspect Ratio aur Styles dono ke liye kaam karega
        // Yeh code Aspect Ratio, Styles (with 'none' icon), Lighting, Camera sab handle karega
        const optionsHtml = data.options.map(opt => {
            let imageElement = ''; // Image/Icon/Shape yahan banega

            // 1. Check for 'none' option with iconSVG
            if (opt.name === 'none' && opt.iconSVG) {
                // 'none' ke liye cross icon dikhao image ki jagah
                imageElement = `<div class="w-full h-16 bg-[var(--bg-dark)] rounded-md flex items-center justify-center mb-1 border-2 border-[var(--border-color)] pointer-events-none text-gray-500">
                                ${opt.iconSVG.replace('<svg ', '<svg class="w-8 h-8" ')} 
                           </div>`; // SVG ko size diya

                // 2. Check for regular image path
            } else if (opt.img) {
                imageElement = `<img src="${opt.img}" class="w-full h-16 object-cover rounded-md mb-1 pointer-events-none bg-[var(--bg-dark)] border border-[var(--border-color)]" alt="${opt.name}">`;

                // 3. Check for Aspect Ratio shape
            } else if (opt.aspect) {
                const aspectStyle = `style="aspect-ratio: ${opt.aspect.replace(':', '/')}"`;
                imageElement = `<div class="w-full bg-[var(--bg-dark)] rounded-md flex items-center justify-center mb-1 border-2 border-gray-600 pointer-events-none" ${aspectStyle}></div>`;

                // 4. Fallback agar kuch na ho
            } else {
                imageElement = `<div class="w-full h-16 bg-[var(--bg-dark)] rounded-md flex items-center justify-center mb-1 border-2 border-gray-600 pointer-events-none text-gray-500">?</div>`;
            }

            // Naam aur Label (icon property optional hai)
            const nameDisplay = opt.icon ? `${opt.icon}${opt.name}` : opt.name; // Agar small icon hai toh naam ke saath dikhao

            return `
    <div class="setting-option border-2 border-transparent p-2 rounded-lg cursor-pointer text-center hover:bg-[var(--bg-card)]" data-value="${opt.name}">
        ${imageElement} 
        <p class="text-sm font-semibold text-[var(--text-primary)] pointer-events-none mt-1">${nameDisplay}</p> 
        <p class="text-xs text-[var(--text-secondary)] pointer-events-none">${opt.label || ''}</p> 
    </div>`;
        }).join('');

        const panelContent = `<div class="w-full bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] h-full flex flex-col"><header class="p-4 flex justify-between items-center border-b border-[var(--border-color)] flex-shrink-0"><h3 class="text-lg font-semibold text-[var(--text-primary)]">${data.title}</h3><button id="close-panel-btn" class="text-2xl hover:text-[var(--text-primary)]">&times;</button></header><div class="p-4 overflow-y-auto custom-scrollbar grid ${gridClass}">${optionsHtml}</div></div>`;
        settingsPanelContainer.innerHTML = panelContent;

        if (window.innerWidth <= 768) {
            // Mobile - bottom sheet (UNCHANGED)
            settingsPanelOverlay.classList.remove('hidden');
            settingsPanelContainer.classList.remove('hidden');
            void settingsPanelContainer.offsetWidth;
            settingsPanelContainer.classList.add('show');
        } else {
            // Desktop - right side panel
            settingsPanelOverlay.classList.remove('hidden');
            settingsPanelContainer.classList.remove('hidden');
        }

        document.getElementById('close-panel-btn').addEventListener('click', closeSettingsPanel);
        if (settingsPanelOverlay) settingsPanelOverlay.addEventListener('click', closeSettingsPanel);

        settingsPanelContainer.querySelectorAll('.setting-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const selectedValue = opt.dataset.value;
                const targetElement = document.querySelector(data.target);
                if (targetElement) targetElement.textContent = (data.prefix || '') + selectedValue;
                if (panelId === 'aspect-ratio-panel') state.selectedAspectRatio = selectedValue;
                if (panelId === 'styles-panel') state.selectedStyle = (data.prefix || '') + selectedValue;
                if (panelId === 'lighting-panel') state.selectedLighting = (data.prefix || '') + selectedValue;
                if (panelId === 'camera-panel') state.selectedCamera = (data.prefix || '') + selectedValue;

                closeSettingsPanel();
            });
        });
    }

    function closeSettingsPanel() {
        isPanelTransitioning = true;

        if (window.innerWidth <= 768) {
            // Mobile - bottom sheet animation (UNCHANGED)
            settingsPanelContainer.classList.remove('show');
            settingsPanelOverlay.classList.add('hidden');

            closePanelTimeout = setTimeout(() => {
                settingsPanelContainer.classList.add('hidden');
                settingsPanelContainer.innerHTML = '';
                closePanelTimeout = null;
                isPanelTransitioning = false;
            }, 300);
        } else {
            // Desktop - simply hide
            settingsPanelContainer.classList.add('hidden');
            settingsPanelOverlay.classList.add('hidden');
            settingsPanelContainer.innerHTML = '';
            isPanelTransitioning = false;
        }
    }
    // ==================== EVENT LISTENERS ====================
    // Menu button functionality
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            if (window.innerWidth >= 768) {
                // Desktop - toggle sidebar with smooth animation
                document.body.classList.toggle('sidebar-collapsed');

                // Update sidebar toggle button text
                if (toggleMenuBtn) {
                    toggleMenuBtn.textContent = document.body.classList.contains('sidebar-collapsed') ? '+' : '−';
                }
            } else {
                // Mobile - existing functionality
                sidebar.classList.toggle('-translate-x-full');
                sidebarOverlay.style.display = sidebar.classList.contains('-translate-x-full') ? 'none' : 'block';
            }
        });
    }
    if (enhancePromptToggle) {
        enhancePromptToggle.addEventListener('change', () => {
            state.enhancePrompt = enhancePromptToggle.checked;
        });
    }
    // Sidebar internal toggle button
    if (toggleMenuBtn) {
        toggleMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth >= 768) {
                document.body.classList.toggle('sidebar-collapsed');
                toggleMenuBtn.textContent = document.body.classList.contains('sidebar-collapsed') ? '+' : '−';
            }
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.style.display = 'none';
        });
    }

    navLinks.forEach(link => { if (link.dataset.page) { link.addEventListener('click', (e) => { e.preventDefault(); switchPage(link.dataset.page); }); } });

    accordions.forEach(header => {
        header.addEventListener("click", () => {
            header.classList.toggle('active');
            const content = header.nextElementSibling;
            content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
        });
    });

    function setupToggle(button, content) { if (button && content) { button.addEventListener('click', (e) => { e.stopPropagation(); content.classList.toggle('hidden'); button.textContent = content.classList.contains('hidden') ? '+' : '−'; }); } }
    setupToggle(toggleMenuBtn, menuLinks);
    setupToggle(toggleToolsBtn, toolsLinks);
    setupToggle(toggleSettingsBtn, settingsLinks);
    setupToggle(toggleSupportBtn, supportLinks);

    if (accountButton) { accountButton.addEventListener('click', (e) => { e.stopPropagation(); accountDropdown.classList.toggle('hidden'); }); }
    document.addEventListener('click', (e) => { if (accountDropdown && !accountButton.contains(e.target) && !accountDropdown.contains(e.target)) { accountDropdown.classList.add('hidden'); } });
    if (lightThemeBtn) lightThemeBtn.addEventListener('click', () => setTheme('light'));
    if (darkThemeBtn) darkThemeBtn.addEventListener('click', () => setTheme('dark'));
    if (generateBtn) generateBtn.addEventListener('click', handleImageGeneration);
    if (promptInput) { promptInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleImageGeneration(); }); }
    if (lightboxClose) lightboxClose.addEventListener('click', () => lightboxOverlay.classList.add('hidden'));
    if (lightboxOverlay) lightboxOverlay.addEventListener('click', (e) => { if (e.target === lightboxOverlay) lightboxOverlay.classList.add('hidden'); });
    document.querySelectorAll('.setting-item').forEach(item => { item.addEventListener('click', (e) => { e.stopPropagation(); openSettingsPanel(item.dataset.panel); }); });
    if (signOutBtn) signOutBtn.addEventListener('click', handleLogout);
    // MULTIPLE IMAGE SELECTION - FINAL FIX
    if (numImageButtons) {
        numImageButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const value = parseInt(btn.dataset.value);

                // Allow selection regardless of pro status for UI flexibility, but check during generation
                // if (value > 1 && !state.isPro) { 
                //     showError('Multiple images require a Pro account.'); 
                //     return; 
                // } 

                state.numImages = value;

                numImageButtons.forEach(b => {
                    b.classList.remove('bg-[var(--accent-primary)]', 'text-black');
                    b.classList.add('bg-transparent', 'text-[var(--text-secondary)]');
                });

                btn.classList.remove('bg-transparent', 'text-[var(--text-secondary)]');
                btn.classList.add('bg-[var(--accent-primary)]', 'text-black');
            });
        });
    }
    // Image Strength Slider Listener
    if (imageStrengthSlider && imageStrengthValue) {
        imageStrengthSlider.addEventListener('input', () => {
            const strength = parseFloat(imageStrengthSlider.value);
            state.imageStrength = strength; // Update state
            imageStrengthValue.textContent = `${Math.round(strength * 100)}%`; // Update display
        });
        // Initial display update
        imageStrengthValue.textContent = `${Math.round(state.imageStrength * 100)}%`;
        imageStrengthSlider.value = state.imageStrength;
    }
    // Contact Form submission ke liye
    // Contact Form submission ke liye (UPGRADED VERSION)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault(); // Page ko reload hone se roko

            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const message = document.getElementById('contact-message').value;

            try {
                const response = await fetch('/contact-submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: name, email: email, message: message })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Thank you, ' + name + '! Your message has been sent.');
                    contactForm.reset(); // Form ko reset karo
                } else {
                    // Server se error message dikhao
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                // Network ya server error
                console.error('Contact form error:', error);
                alert('An error occurred. Please try again later.');
            }
        });
    }
    // Search Icon Click
    if (searchIconButton) {
        searchIconButton.addEventListener('click', () => {
            switchPage('search'); // Search page par navigate karein
            if (mainSearchInput) {
                mainSearchInput.focus(); // Input field par focus karein
            }
        });
    }

    // Basic Search Logic (Page Navigation Example)
    // Search Input Logic (UPDATED FOR API SEARCH)
    if (mainSearchInput && searchResultsContainer) {
        let searchTimeout = null; // Timeout add karein taaki har key press par API call na ho

        mainSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            searchResultsContainer.innerHTML = ''; // Clear previous results

            // Clear existing timeout
            clearTimeout(searchTimeout);

            if (!query) {
                searchResultsContainer.innerHTML = '<p class="text-center text-gray-500">Search your prompts and images...</p>';
                return;
            }

            searchResultsContainer.innerHTML = '<p class="text-center text-gray-500">Searching...</p>'; // Show loading

            // Set a new timeout (e.g., 300ms)
            searchTimeout = setTimeout(async () => {
                try {
                    // Backend API ko call karein
                    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
                    if (!response.ok) {
                        throw new Error('Search request failed');
                    }
                    const results = await response.json();

                    searchResultsContainer.innerHTML = ''; // Clear loading message

                    if (results.length > 0) {
                        results.forEach(item => {
                            const resultDiv = document.createElement('div');
                            resultDiv.className = 'p-3 bg-[var(--bg-sidebar)] rounded-lg flex items-center justify-between gap-4 hover:bg-[var(--bg-card)] cursor-pointer';

                            let contentHTML = '';
                            if (item.type === 'history') {
                                // History item ka layout
                                contentHTML = `
                                <div class="flex-1 truncate">
                                    <p class="text-[var(--text-primary)] text-sm truncate">${item.text}</p>
                                    <p class="text-xs text-gray-500">Prompt History</p>
                                </div>
                                <button class="reuse-prompt-btn text-xs bg-[var(--accent-primary)] text-black px-3 py-1 rounded-md font-semibold flex-shrink-0">Reuse</button>
                            `;
                                resultDiv.innerHTML = contentHTML;
                                resultDiv.querySelector('.reuse-prompt-btn').onclick = (e) => {
                                    e.stopPropagation(); // Prevent div click
                                    if (promptInput) {
                                        promptInput.value = item.text;
                                        switchPage('text-to-image');
                                        promptInput.focus();
                                    }
                                };
                                // History item par click karke bhi prompt reuse ho
                                resultDiv.onclick = () => {
                                    if (promptInput) {
                                        promptInput.value = item.text;
                                        switchPage('text-to-image');
                                        promptInput.focus();
                                    }
                                };

                            } else if (item.type === 'image' || item.type === 'liked_image') {
                                // Image item ka layout
                                contentHTML = `
                                <img src="${item.imageUrl}" alt="Generated image" class="w-12 h-12 object-cover rounded-md flex-shrink-0">
                                <div class="flex-1 truncate">
                                    <p class="text-[var(--text-primary)] text-sm truncate">${item.text}</p>
                                    <p class="text-xs text-gray-500">${item.type === 'liked_image' ? 'Liked Image' : 'Generated Image'}</p>
                                </div>
                                <button class="view-image-btn text-xs bg-gray-600 text-white px-3 py-1 rounded-md font-semibold flex-shrink-0">View</button>
                            `;
                                resultDiv.innerHTML = contentHTML;
                                resultDiv.querySelector('.view-image-btn').onclick = (e) => {
                                    e.stopPropagation();
                                    openLightbox(item.imageUrl); // Lightbox kholein
                                };
                                // Image item par click karke bhi lightbox kholein
                                resultDiv.onclick = () => {
                                    openLightbox(item.imageUrl);
                                };
                            }

                            searchResultsContainer.appendChild(resultDiv);
                        });
                    } else {
                        searchResultsContainer.innerHTML = '<p class="text-center text-gray-500">No results found.</p>';
                    }

                } catch (error) {
                    console.error('Search error:', error);
                    searchResultsContainer.innerHTML = '<p class="text-center text-red-500">Error performing search.</p>';
                }
            }, 300); // 300ms wait karega type karne ke baad
        });
    }
    if (imageDropZone) { imageDropZone.addEventListener('click', () => imageUploadInput.click()); imageDropZone.addEventListener('dragover', (e) => { e.preventDefault(); imageDropZone.classList.add('border-[var(--accent-primary)]'); }); imageDropZone.addEventListener('dragleave', () => imageDropZone.classList.remove('border-[var(--accent-primary)]')); imageDropZone.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleImageUpload(e.dataTransfer.files[0]); }); }
    if (imageUploadInput) { imageUploadInput.addEventListener('change', () => { if (imageUploadInput.files.length) handleImageUpload(imageUploadInput.files[0]); }); }
    if (removeImageBtn) { removeImageBtn.addEventListener('click', (e) => { e.stopPropagation(); removeUploadedImage(); }); }
    if (promptAssistantBtn) { promptAssistantBtn.addEventListener('click', () => { promptSuggestionsBox.classList.toggle('hidden'); if (!promptSuggestionsBox.classList.contains('hidden')) renderPromptSuggestions(); }); }
    if (refreshSuggestionsBtn) { refreshSuggestionsBtn.addEventListener('click', renderPromptSuggestions); }
    if (generatePromptsBtn) { generatePromptsBtn.addEventListener('click', generateAIPrompts); }
    // ==================== APP INITIALIZATION ====================
    // ==================== APP INITIALIZATION (Naya waala) ====================
    async function init() {
        const savedTheme = localStorage.getItem('colorMode') || 'dark';
        setTheme(savedTheme);

        // Authentication check aur data loading
        try {
            const authRes = await fetch('/check-auth', { credentials: 'include' });
            const authData = await authRes.json();

            if (authData.loggedIn) {
                // User logged in hai, profile fetch karo
                const profileRes = await fetch('/api/user/profile', { credentials: 'include' });
                if (!profileRes.ok) throw new Error('Failed to fetch profile');

                const profileData = await profileRes.json();
                state.isLoggedIn = true;
                state.isPro = profileData.isPro;
                state.userName = profileData.fullname;
                state.credits = profileData.credits;

                // User ka data fetch karo (Likes, Images, History)
                await fetchUserData();

            } else {
                // User guest hai, local data load karo
                loadGuestSession();
            }
        } catch (e) {
            console.error("Initialization failed, loading as guest:", e);
            loadGuestSession(); // Koi bhi error aaye toh guest ki tarah load karo
        }

        renderUI(); // Poora data load hone ke baad UI render karo
        switchPage('text-to-image');

        // Accordions ko default open rakho
        const firstMenuAccordion = document.querySelector('#menu-links .accordion-header');
        if (firstMenuAccordion) firstMenuAccordion.click();
        const firstSettingsAccordion = document.querySelector('#settings-links .accordion-header');
        if (firstSettingsAccordion) firstSettingsAccordion.click();
    }
    // Start the application
    window.state = state;
    window.renderUI = renderUI;
    window.loadGuestSession = loadGuestSession;
    window.fetchUserData = fetchUserData;

    init();
});

