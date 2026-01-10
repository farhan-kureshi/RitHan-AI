// --- Saari JavaScript Functionality Yahan Hai ---

const preloader = document.getElementById('preloader');
const mainContent = document.getElementById('main-content');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const accordionHeaders = document.querySelectorAll('.accordion-header');
const mainHeader = document.getElementById('main-header');
const backToTopButton = document.getElementById('back-to-top');


function startTypingAnimation() {
    const typingTextElement = document.getElementById('typing-text');
    if (typingTextElement) {
        const textToType = "Turn Text to <span class='text-[#00FFFF]'>Image</span>, in Seconds.";
        let i = 0;
        typingTextElement.innerHTML = '';

        function typeWriter() {
            if (i < textToType.length) {
                if (textToType.substring(i, i + 6) === "<span ") {
                    const closingTagIndex = textToType.indexOf('>', i);
                    typingTextElement.innerHTML += textToType.substring(i, closingTagIndex + 1);
                    i = closingTagIndex + 1;
                } else if (textToType.substring(i, i + 7) === "</span>") {
                    typingTextElement.innerHTML += "</span>";
                    i += 7;
                } else {
                    typingTextElement.innerHTML += textToType.charAt(i);
                    i++;
                }
                setTimeout(typeWriter, 70);
            }
        }
        typeWriter();
    }
}

// NAYA AUR BEHTAR CODE
window.addEventListener('load', () => {
    // 1. Pehle check karo ki browser ki memory mein 'preloaderShown' set hai ya nahi
    if (sessionStorage.getItem('preloaderShown')) {
        // Agar set hai, to preloader ko turant bina animation ke hide kar do
        preloader.style.display = 'none';
        mainContent.style.opacity = '1';
        startTypingAnimation(); // Typing animation phir bhi chala do
    } else {
        // Agar set nahi hai (matlab user pehli baar आया hai), to animation dikhao
        setTimeout(() => {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
                mainContent.style.opacity = '1';
                startTypingAnimation();
                
                // 2. Ab browser ki memory mein set kar do ki preloader dikh chuka hai
                sessionStorage.setItem('preloaderShown', 'true');
            }, 500); 
        }, 1000); 
    }
});
const filterContainer = document.querySelector('#filter-buttons');
if (filterContainer) {
    const filterButtons = filterContainer.querySelectorAll('button');
    const galleryContainers = document.querySelectorAll('.gallery-grid');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            });
            button.classList.add('btn-primary');
            button.classList.remove('btn-secondary');

            const filter = button.dataset.filter;
            galleryContainers.forEach(container => {
                if (container.id === `gallery-${filter}`) {
                    container.classList.remove('hidden');
                } else {
                    container.classList.add('hidden');
                }
            });
        });
    });
}
// FIX: Pehle check karein ki button hai ya nahi
if (mobileMenuButton) {
    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}
accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
        const accordionContent = header.nextElementSibling;
        const accordionIcon = header.querySelector('svg');
        const isOpening = !accordionContent.style.maxHeight || accordionContent.style.maxHeight === "0px";
        document.querySelectorAll('.accordion-content').forEach(content => content.style.maxHeight = null);
        document.querySelectorAll('.accordion-header svg').forEach(icon => icon.style.transform = 'rotate(0deg)');
        if (isOpening) {
            accordionContent.style.maxHeight = accordionContent.scrollHeight + 'px';
            accordionIcon.style.transform = 'rotate(180deg)';
        }
    });
});

// --- UPDATED THEME TOGGLE LOGIC ---
const modeToggle = document.getElementById('modeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const body = document.body;

// Function to enable Light Mode
function enableLightMode() {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    sunIcon.classList.remove('hidden'); // Light mode mein Sun dikhega
    moonIcon.classList.add('hidden');
    localStorage.setItem('colorMode', 'light'); // Choice ko save karein
}

// Function to enable Dark Mode
function enableDarkMode() {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    moonIcon.classList.remove('hidden'); // Dark mode mein Moon dikhega
    sunIcon.classList.add('hidden');
    localStorage.setItem('colorMode', 'dark'); // Choice ko save karein
}

// Page load hone par check karein ki konsi theme save ki gayi thi
const savedMode = localStorage.getItem('colorMode');
if (savedMode === 'light') {
    enableLightMode();
} else {
    enableDarkMode(); // Default mein dark mode rakhein
}

// Button par click karne par theme badlein
modeToggle.addEventListener('click', () => {
    if (body.classList.contains('dark-mode')) {
        enableLightMode();
    } else {
        enableDarkMode();
    }
});

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        mainHeader.classList.add('sticky');
    } else {
        mainHeader.classList.remove('sticky');
    }

    if (window.scrollY > 300) {
        backToTopButton.classList.add('show');
    } else {
        backToTopButton.classList.remove('show');
    }
});

// FIX: Yahaan bhi check add karein
if (backToTopButton) {
    backToTopButton.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Yeh line aakhri thi, iske baad kuch nahi
const textToType = "Turn Text to <span class='headline-key headline-gradient-dark'>Image</span>, in Seconds.";