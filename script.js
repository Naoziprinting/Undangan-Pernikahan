// Google Apps Script Web App URL - Ganti dengan URL Anda
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRYk27RzfprCG8_QlKZOj-trVg9fRfPE_TpEmfPHqBfdBHUl7IdTYfNFu50lgmQ7jEmQ/exec';

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    console.log('Website Undangan Pernikahan siap!');
    
    // Setup smooth scrolling untuk navigasi
    setupSmoothScrolling();
    
    // Setup toggle navigasi mobile
    setupMobileNav();
    
    // Hitung mundur hari pernikahan
    updateCountdown();
    setInterval(updateCountdown, 1000);
    
    // Setup form RSVP
    setupRSVPForm();
    
    // Setup audio player
    setupAudioPlayer();
    
    // Setup modal
    setupModal();
    
    // Setup Leaflet Map
    initMap();
    
    // Setup intersection observer untuk animasi
    setupIntersectionObserver();
    
    // Ambil parameter dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const guestId = urlParams.get('guest');
    
    // Load nama tamu jika ada parameter guest
    if (guestId) {
        loadGuestName(guestId);
        document.getElementById('guestId').value = guestId;
    } else {
        // Jika tidak ada guest ID, buat field nama bisa diisi
        const nameField = document.getElementById('guestName');
        nameField.placeholder = 'Masukkan nama lengkap Anda';
    }
    
    // Load statistik dan komentar
    loadGuestStats();
    loadComments();
    
    // Auto refresh stats dan komentar setiap 30 detik
    setInterval(loadGuestStats, 30000);
    setInterval(loadComments, 30000);
});

// Setup smooth scrolling untuk navigasi
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                // Tutup menu mobile jika terbuka
                const navMenu = document.querySelector('.nav-menu');
                const navToggle = document.getElementById('navToggle');
                if (navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    navToggle.innerHTML = '<i class="fas fa-bars"></i>';
                }
            }
        });
    });
}

// Toggle navigasi mobile
function setupMobileNav() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!navToggle || !navMenu) return;
    
    navToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        this.innerHTML = navMenu.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
    
    // Tutup menu saat klik di luar
    document.addEventListener('click', function(e) {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            navToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
}

// Hitung mundur hari pernikahan
function updateCountdown() {
    const weddingDate = new Date('December 25, 2025 08:00:00').getTime();
    const now = new Date().getTime();
    const timeLeft = weddingDate - now;
    
    if (timeLeft < 0) {
        document.getElementById('countdown').innerHTML = '<div class="countdown-ended">Hari pernikahan telah tiba!</div>';
        return;
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    document.getElementById('days').textContent = days.toString().padStart(2, '0');
    document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
}

// Load nama tamu dari Google Sheets berdasarkan ID
async function loadGuestName(guestId) {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getGuest&id=${encodeURIComponent(guestId)}`);
        const data = await response.json();
        
        if (data.success && data.guestName) {
            // Tampilkan nama tamu di hero section
            const guestNameElement = document.getElementById('displayGuestName');
            const guestNameField = document.getElementById('guestName');
            
            guestNameElement.textContent = data.guestName;
            guestNameField.value = data.guestName;
            
            // Tambahkan info tambahan jika ada
            if (data.additionalInfo && data.additionalInfo.length > 0) {
                const additionalInfo = data.additionalInfo.filter(info => info).join(', ');
                if (additionalInfo) {
                    guestNameElement.innerHTML += `<br><small style="font-size: 1.2rem; opacity: 0.8;">${additionalInfo}</small>`;
                }
            }
        } else {
            showError('Tamu tidak ditemukan. Silakan isi nama manual.');
        }
    } catch (error) {
        console.error('Error loading guest name:', error);
        showError('Gagal memuat data tamu. Silakan isi nama manual.');
    }
}

// Setup form RSVP dengan validasi
function setupRSVPForm() {
    const rsvpForm = document.getElementById('rsvpForm');
    const submitBtn = document.getElementById('submitBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (!rsvpForm || !submitBtn) return;
    
    rsvpForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validasi form
        if (!validateRSVPForm()) {
            return;
        }
        
        // Tampilkan loading
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        submitBtn.disabled = true;
        
        // Kumpulkan data form
        const formData = {
            name: document.getElementById('guestName').value.trim(),
            email: document.getElementById('guestEmail').value.trim() || '',
            phone: document.getElementById('guestPhone').value.trim(),
            guestCount: document.getElementById('guestCount').value,
            attendance: document.querySelector('input[name="attendance"]:checked').value,
            message: document.getElementById('message').value.trim() || '',
            guestId: document.getElementById('guestId').value || 'unknown',
            timestamp: new Date().toISOString()
        };
        
        try {
            // Kirim data ke Google Apps Script
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Reset form
                rsvpForm.reset();
                
                // Tampilkan modal sukses
                showSuccessModal();
                
                // Update statistik dan komentar
                loadGuestStats();
                loadComments();
                
                // Scroll ke top form
                setTimeout(() => {
                    document.getElementById('rsvp').scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 100);
            } else {
                throw new Error(result.message || 'Gagal mengirim data');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Maaf, terjadi kesalahan saat mengirim data. Silakan coba lagi.');
        } finally {
            // Sembunyikan loading
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            submitBtn.innerHTML = '<span>Kirim Konfirmasi</span><i class="fas fa-paper-plane"></i>';
            submitBtn.disabled = false;
        }
    });
}

// Validasi form RSVP
function validateRSVPForm() {
    const name = document.getElementById('guestName').value.trim();
    const phone = document.getElementById('guestPhone').value.trim();
    const guestCount = document.getElementById('guestCount').value;
    const attendance = document.querySelector('input[name="attendance"]:checked');
    const email = document.getElementById('guestEmail').value.trim();
    
    if (!name) {
        showError('Mohon isi nama lengkap');
        document.getElementById('guestName').focus();
        return false;
    }
    
    if (!phone) {
        showError('Mohon isi nomor telepon/WhatsApp');
        document.getElementById('guestPhone').focus();
        return false;
    }
    
    // Validasi format telepon
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(phone)) {
        showError('Mohon isi nomor telepon yang valid');
        document.getElementById('guestPhone').focus();
        return false;
    }
    
    if (!guestCount) {
        showError('Mohon pilih jumlah tamu');
        document.getElementById('guestCount').focus();
        return false;
    }
    
    if (!attendance) {
        showError('Mohon pilih konfirmasi kehadiran');
        return false;
    }
    
    // Validasi email jika diisi
    if (email && !isValidEmail(email)) {
        showError('Mohon isi email yang valid');
        document.getElementById('guestEmail').focus();
        return false;
    }
    
    return true;
}

// Validasi email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Tampilkan modal sukses
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Auto close modal setelah 5 detik
        setTimeout(() => {
            modal.style.display = 'none';
        }, 5000);
    }
}

// Setup modal
function setupModal() {
    const modal = document.getElementById('successModal');
    const modalClose = document.getElementById('modalClose');
    
    if (!modal || !modalClose) return;
    
    modalClose.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Tutup modal saat klik di luar
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Tutup modal dengan ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            modal.style.display = 'none';
        }
    });
}

// Setup audio player
function setupAudioPlayer() {
    const audioToggle = document.getElementById('audioToggle');
    const audioPlayer = document.getElementById('weddingAudio');
    
    if (!audioToggle || !audioPlayer) return;
    
    // Cek preferensi pengguna
    const musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
    
    if (musicEnabled) {
        audioPlayer.play().catch(e => {
            console.log('Autoplay prevented:', e);
            audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
            localStorage.setItem('musicEnabled', 'false');
        });
        audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
    } else {
        audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
    
    audioToggle.addEventListener('click', function() {
        if (audioPlayer.paused) {
            audioPlayer.play();
            audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
            localStorage.setItem('musicEnabled', 'true');
        } else {
            audioPlayer.pause();
            audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
            localStorage.setItem('musicEnabled', 'false');
        }
    });
}

// Setup Leaflet map
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    
    try {
        // Koordinat lokasi resepsi (contoh: Yogyakarta)
        const receptionLocation = [-7.7956, 110.3695];
        
        const map = L.map('map').setView(receptionLocation, 15);
        
        // Tambahkan tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);
        
        // Tambahkan custom marker
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<i class="fas fa-heart" style="color: #a67c52; font-size: 2rem; text-shadow: 0 0 10px white;"></i>',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });
        
        // Tambahkan marker
        const marker = L.marker(receptionLocation, { icon: customIcon })
            .addTo(map)
            .bindPopup(`
                <div style="text-align: center; padding: 10px;">
                    <h3 style="margin: 0 0 10px; color: #a67c52;">Gedung Serbaguna Sejahtera</h3>
                    <p style="margin: 0;">Jl. Sudirman No. 45, Yogyakarta</p>
                    <p style="margin: 10px 0 0;"><strong>25 Desember 2025</strong></p>
                    <p style="margin: 0;">11:00 - 14:00 WIB</p>
                </div>
            `);
        
        // Buka popup secara otomatis
        marker.openPopup();
        
    } catch (error) {
        console.error('Error initializing map:', error);
        mapElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f4e9; border-radius: var(--border-radius);">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-map-marker-alt" style="font-size: 3rem; color: #a67c52; margin-bottom: 20px;"></i>
                    <h3 style="color: #5c4b37; margin-bottom: 10px;">Lokasi Acara</h3>
                    <p style="color: #777; margin-bottom: 5px;">Jl. Sudirman No. 45, Yogyakarta</p>
                    <a href="https://goo.gl/maps/example2" target="_blank" style="display: inline-block; margin-top: 20px; padding: 12px 25px; background: #a67c52; color: white; text-decoration: none; border-radius: 30px; font-weight: 600;">
                        <i class="fas fa-map-marked-alt"></i> Buka di Google Maps
                    </a>
                </div>
            </div>
        `;
    }
}

// Setup intersection observer untuk animasi
function setupIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe timeline items
    document.querySelectorAll('.timeline-item').forEach(item => {
        observer.observe(item);
    });
    
    // Observe section elements
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

// Load statistik tamu dari Google Sheets
async function loadGuestStats() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStats`);
        const stats = await response.json();
        
        if (stats.success) {
            document.getElementById('attendingCount').textContent = stats.attending || 0;
            document.getElementById('notAttendingCount').textContent = stats.notAttending || 0;
            document.getElementById('totalGuestsCount').textContent = stats.totalGuests || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load komentar dari Google Sheets
async function loadComments() {
    const commentsList = document.getElementById('commentsList');
    const commentsLoader = document.getElementById('commentsLoader');
    const commentsEmpty = document.getElementById('commentsEmpty');
    const commentsCount = document.getElementById('commentsCount');
    
    if (!commentsList || !commentsLoader || !commentsEmpty) return;
    
    try {
        // Tampilkan loader, sembunyikan empty state
        commentsLoader.style.display = 'block';
        commentsEmpty.style.display = 'none';
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getComments`);
        const data = await response.json();
        
        // Sembunyikan loader
        commentsLoader.style.display = 'none';
        
        if (data.success && data.comments && data.comments.length > 0) {
            // Update jumlah komentar
            if (commentsCount) {
                commentsCount.textContent = data.comments.length;
            }
            
            // Kosongkan komentar lama
            commentsList.innerHTML = '';
            
            // Tambahkan komentar baru dengan delay untuk animasi
            data.comments.forEach((comment, index) => {
                setTimeout(() => {
                    const commentElement = createCommentElement(comment);
                    commentsList.appendChild(commentElement);
                }, index * 100);
            });
            
            // Sembunyikan empty state
            commentsEmpty.style.display = 'none';
        } else {
            // Tampilkan empty state
            commentsEmpty.style.display = 'block';
            if (commentsCount) {
                commentsCount.textContent = '0';
            }
        }
        
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsLoader.style.display = 'none';
        commentsEmpty.style.display = 'block';
        commentsEmpty.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Gagal memuat ucapan. Silakan coba beberapa saat lagi.</p>
        `;
    }
}

// Fungsi untuk membuat elemen komentar
function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = `comment-item ${comment.isHost ? 'host-comment' : ''}`;
    
    // Generate warna avatar berdasarkan nama
    const avatarColor = generateAvatarColor(comment.name);
    
    // Tentukan badge kehadiran
    let attendanceBadge = '';
    if (comment.attendance === 'Hadir') {
        attendanceBadge = `<span class="attendance-badge attendance-yes">
            <i class="fas fa-check-circle"></i> Akan Hadir
        </span>`;
    } else {
        attendanceBadge = `<span class="attendance-badge attendance-no">
            <i class="fas fa-times-circle"></i> Tidak Hadir
        </span>`;
    }
    
    // Tentukan badge host
    let hostBadge = '';
    if (comment.isHost) {
        hostBadge = `<span class="host-badge">
            <i class="fas fa-crown"></i> Keluarga
        </span>`;
    }
    
    // Ambil inisial untuk avatar
    const initials = getInitials(comment.name);
    
    div.innerHTML = `
        <div class="comment-header">
            <div class="comment-avatar" style="background: ${avatarColor};">
                ${initials}
            </div>
            <div class="comment-info">
                <div class="comment-name">
                    ${escapeHtml(comment.name)}
                    ${hostBadge}
                </div>
                <div class="comment-meta">
                    <span class="comment-time" title="${comment.exactTime}">
                        <i class="far fa-clock"></i> ${comment.timeAgo}
                    </span>
                    ${attendanceBadge}
                    ${comment.guests ? `<span style="color: var(--text-light);"><i class="fas fa-users"></i> ${comment.guests} orang</span>` : ''}
                </div>
            </div>
        </div>
        <div class="comment-content">
            ${formatCommentText(comment.message)}
        </div>
    `;
    
    return div;
}

// Fungsi untuk menghasilkan warna avatar berdasarkan nama
function generateAvatarColor(name) {
    const colors = [
        '#D4AF37', '#B8860B', '#8B6914', // Gold tones
        '#2a6e3f', '#3a8c5f', '#4aaa7f', // Green tones
        '#6a5acd', '#7b68ee', '#9370db', // Purple tones
        '#cd853f', '#d2691e', '#b22222', // Brown/Red tones
        '#4682b4', '#5f9ea0', '#6495ed'  // Blue tones
    ];
    
    // Generate hash dari nama
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Pilih warna berdasarkan hash
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

// Fungsi untuk mendapatkan inisial nama
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Fungsi untuk memformat teks komentar
function formatCommentText(text) {
    if (!text) return '';
    
    // Escape HTML
    text = escapeHtml(text);
    
    // Ganti newline dengan <br>
    text = text.replace(/\n/g, '<br>');
    
    // Deteksi dan format emoji
    const emojiMap = {
        ':)': '😊',
        ':(': '😔',
        ':D': '😃',
        ';)': '😉',
        ':P': '😛',
        '<3': '❤️',
        ':heart:': '❤️',
        ':pray:': '🙏',
        ':smile:': '😊',
        ':blush:': '😊',
        ':thumbsup:': '👍',
        ':clap:': '👏'
    };
    
    Object.keys(emojiMap).forEach(emoji => {
        const regex = new RegExp(emoji.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        text = text.replace(regex, emojiMap[emoji]);
    });
    
    // Deteksi dan format link
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, url => `<a href="${url}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">${url}</a>`);
    
    return text;
}

// Fungsi untuk escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fungsi untuk menampilkan error
function showError(message) {
    // Buat atau gunakan notifikasi error
    let errorDiv = document.getElementById('errorNotification');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'errorNotification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 2000;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(errorDiv);
        
        // Tambahkan style untuk animasi
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Auto hide setelah 5 detik
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            errorDiv.remove();
        }, 300);
    }, 5000);
}

// Setup refresh comments button
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refreshComments');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
            this.disabled = true;
            
            await loadComments();
            
            // Restore button state
            setTimeout(() => {
                this.innerHTML = originalHTML;
                this.disabled = false;
                
                // Animation feedback
                this.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 300);
            }, 500);
        });
    }
});

// Efek scroll untuk navbar
window.addEventListener('scroll', function() {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;
    
    if (window.scrollY > 100) {
        navContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
        navContainer.style.padding = '10px 0';
        navContainer.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
    } else {
        navContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        navContainer.style.padding = '15px 0';
        navContainer.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.08)';
    }
});

// Preload images untuk performa lebih baik
function preloadImages() {
    const images = [
        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3',
        'https://images.unsplash.com/photo-1511988617509-a57c8a288659?ixlib=rb-4.0.3',
        'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?ixlib=rb-4.0.3',
        'https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3'
    ];
    
    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Panggil preload images setelah halaman dimuat
window.addEventListener('load', preloadImages);
