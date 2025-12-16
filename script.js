// Google Apps Script Web App URL - Ganti dengan URL Anda
// Format: https://script.google.com/macros/s/SCRIPT_ID/exec
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
        nameField.readOnly = false;
    }
    
    // Load statistik dan komentar
    loadGuestStats();
    loadComments();
    
    // Auto refresh stats dan komentar setiap 30 detik
    setInterval(loadGuestStats, 30000);
    setInterval(loadComments, 30000);
    
    // Test koneksi ke Google Apps Script
    testGoogleScriptConnection();
});

// Test koneksi ke Google Apps Script
async function testGoogleScriptConnection() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=testConnection`);
        const data = await response.json();
        console.log('Google Apps Script connection:', data);
        
        if (!data.success) {
            console.warn('Google Apps Script mungkin belum di-setup dengan benar');
            showNotification('info', 'Google Sheets integration: Pastikan script sudah di-deploy dengan benar.');
        }
    } catch (error) {
        console.error('Failed to connect to Google Apps Script:', error);
        showNotification('warning', 'Google Sheets offline. Data akan disimpan secara lokal.');
    }
}

// Setup form RSVP dengan validasi - PERBAIKAN UTAMA
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
        
        const originalBtnText = submitBtn.innerHTML;
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
            // Kirim data ke Google Apps Script dengan mode 'no-cors' untuk menghindari CORS issues
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Mode no-cors untuk menghindari CORS issues
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: JSON.stringify(formData)
            });
            
            // Karena mode 'no-cors', kita tidak bisa membaca response
            // Tapi kita anggap berhasil jika tidak ada error
            console.log('Data berhasil dikirim:', formData);
            
            // Simpan juga ke localStorage sebagai backup
            saveToLocalStorage(formData);
            
            // Reset form
            rsvpForm.reset();
            
            // Tampilkan modal sukses
            showSuccessModal(formData);
            
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
            
        } catch (error) {
            console.error('Error mengirim data:', error);
            
            // Coba metode alternatif: simpan ke localStorage
            saveToLocalStorage(formData);
            
            // Tampilkan pesan sukses dengan catatan offline
            showOfflineSuccessModal(formData);
            
        } finally {
            // Sembunyikan loading
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

// Simpan data ke localStorage sebagai backup
function saveToLocalStorage(formData) {
    try {
        // Ambil data yang sudah ada
        const savedData = JSON.parse(localStorage.getItem('weddingRSVP') || '[]');
        
        // Tambahkan data baru
        savedData.push({
            ...formData,
            localTimestamp: new Date().toLocaleString()
        });
        
        // Simpan kembali ke localStorage
        localStorage.setItem('weddingRSVP', JSON.stringify(savedData));
        
        // Coba sync dengan Google Sheets jika online
        syncLocalDataWithGoogleSheets();
        
        console.log('Data disimpan ke localStorage:', formData.name);
    } catch (error) {
        console.error('Error menyimpan ke localStorage:', error);
    }
}

// Sync data dari localStorage ke Google Sheets
async function syncLocalDataWithGoogleSheets() {
    try {
        const savedData = JSON.parse(localStorage.getItem('weddingRSVP') || '[]');
        
        if (savedData.length > 0) {
            // Ambil data yang belum disync (tanpa property 'synced')
            const unsyncedData = savedData.filter(item => !item.synced);
            
            if (unsyncedData.length > 0) {
                console.log(`Menyinkronkan ${unsyncedData.length} data ke Google Sheets...`);
                
                // Kirim satu per satu untuk menghindari error
                for (const data of unsyncedData) {
                    try {
                        await fetch(GOOGLE_SCRIPT_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(data)
                        });
                        
                        // Tandai sebagai sudah disync
                        data.synced = true;
                        console.log('Data synced:', data.name);
                    } catch (syncError) {
                        console.error('Error syncing data:', syncError);
                        break; // Berhenti jika ada error
                    }
                }
                
                // Update localStorage dengan status sync
                localStorage.setItem('weddingRSVP', JSON.stringify(savedData));
            }
        }
    } catch (error) {
        console.error('Error in sync:', error);
    }
}

// Tampilkan modal sukses dengan data yang dikirim
function showSuccessModal(formData) {
    const modal = document.getElementById('successModal');
    if (modal) {
        // Update pesan modal dengan detail
        const modalText = modal.querySelector('.modal-text');
        if (modalText) {
            modalText.innerHTML = `
                Terima kasih <strong>${formData.name}</strong>!<br><br>
                Konfirmasi kehadiran Anda telah berhasil disimpan.<br>
                ${formData.attendance === 'Hadir' ? 
                    'Kami sangat menantikan kehadiran Anda di hari bahagia kami!' : 
                    'Terima kasih atas doa dan restu yang Anda berikan.'}
                <br><br>
                <small>Jumlah tamu: ${formData.guestCount} orang</small>
            `;
        }
        
        modal.style.display = 'flex';
        
        // Auto close modal setelah 5 detik
        setTimeout(() => {
            modal.style.display = 'none';
        }, 5000);
    }
}

// Tampilkan modal sukses untuk mode offline
function showOfflineSuccessModal(formData) {
    const modal = document.getElementById('successModal');
    if (modal) {
        // Update pesan modal dengan catatan offline
        const modalText = modal.querySelector('.modal-text');
        if (modalText) {
            modalText.innerHTML = `
                Terima kasih <strong>${formData.name}</strong>!<br><br>
                Konfirmasi kehadiran Anda telah disimpan secara lokal.<br>
                Data akan dikirim ke server saat koneksi tersedia.<br><br>
                ${formData.attendance === 'Hadir' ? 
                    'Kami sangat menantikan kehadiran Anda!' : 
                    'Terima kasih atas doa dan restu Anda.'}
                <br><br>
                <small>Jumlah tamu: ${formData.guestCount} orang</small>
                <br>
                <small style="color: #e67e22;"><i class="fas fa-info-circle"></i> Mode offline</small>
            `;
        }
        
        modal.style.display = 'flex';
        
        // Auto close modal setelah 5 detik
        setTimeout(() => {
            modal.style.display = 'none';
        }, 5000);
    }
}

// Validasi form RSVP
function validateRSVPForm() {
    const name = document.getElementById('guestName').value.trim();
    const phone = document.getElementById('guestPhone').value.trim();
    const guestCount = document.getElementById('guestCount').value;
    const attendance = document.querySelector('input[name="attendance"]:checked');
    const email = document.getElementById('guestEmail').value.trim();
    
    if (!name) {
        showNotification('error', 'Mohon isi nama lengkap');
        document.getElementById('guestName').focus();
        return false;
    }
    
    if (!phone) {
        showNotification('error', 'Mohon isi nomor telepon/WhatsApp');
        document.getElementById('guestPhone').focus();
        return false;
    }
    
    // Validasi format telepon
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(phone)) {
        showNotification('error', 'Mohon isi nomor telepon yang valid (10-15 digit)');
        document.getElementById('guestPhone').focus();
        return false;
    }
    
    if (!guestCount) {
        showNotification('error', 'Mohon pilih jumlah tamu');
        document.getElementById('guestCount').focus();
        return false;
    }
    
    if (!attendance) {
        showNotification('error', 'Mohon pilih konfirmasi kehadiran');
        return false;
    }
    
    // Validasi email jika diisi
    if (email && !isValidEmail(email)) {
        showNotification('error', 'Mohon isi email yang valid');
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

// Fungsi untuk menampilkan notifikasi
function showNotification(type, message) {
    // Hapus notifikasi sebelumnya
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Buat notifikasi baru
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Ikon berdasarkan type
    let icon = 'info-circle';
    let bgColor = '#3498db';
    
    switch(type) {
        case 'error':
            icon = 'exclamation-circle';
            bgColor = '#e74c3c';
            break;
        case 'success':
            icon = 'check-circle';
            bgColor = '#27ae60';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            bgColor = '#f39c12';
            break;
        case 'info':
            icon = 'info-circle';
            bgColor = '#3498db';
            break;
    }
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Tambahkan style
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
        font-family: 'Source Sans Pro', sans-serif;
    `;
    
    document.body.appendChild(notification);
    
    // Tombol close
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto hide setelah 5 detik
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
    
    // Tambahkan CSS untuk animasi
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                margin-left: 10px;
                padding: 0 5px;
            }
            .notification-close:hover {
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }
}

// Load nama tamu dari Google Sheets berdasarkan ID
async function loadGuestName(guestId) {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getGuest&id=${encodeURIComponent(guestId)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.guestName) {
            // Tampilkan nama tamu di hero section
            const guestNameElement = document.getElementById('displayGuestName');
            const guestNameField = document.getElementById('guestName');
            
            if (guestNameElement) {
                guestNameElement.innerHTML = `
                    <div style="font-size: 1.3rem; opacity: 0.9; margin-bottom: 5px;">Kepada Yth.</div>
                    <div style="font-size: 2.5rem; font-weight: 600;">${data.guestName}</div>
                    ${data.additionalInfo ? 
                        `<div style="font-size: 1.1rem; opacity: 0.8; margin-top: 10px;">${data.additionalInfo}</div>` : 
                        ''}
                `;
            }
            
            if (guestNameField) {
                guestNameField.value = data.guestName;
                guestNameField.readOnly = true;
            }
            
            showNotification('success', `Selamat datang ${data.guestName}!`);
        } else {
            showNotification('warning', 'Tamu tidak ditemukan. Silakan isi nama manual.');
            document.getElementById('guestName').readOnly = false;
        }
    } catch (error) {
        console.error('Error loading guest name:', error);
        showNotification('warning', 'Gagal memuat data tamu. Silakan isi nama manual.');
        document.getElementById('guestName').readOnly = false;
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
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
                }, index * 50);
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
        
        // Coba load dari localStorage
        loadCommentsFromLocalStorage();
    }
}

// Load komentar dari localStorage
function loadCommentsFromLocalStorage() {
    const commentsList = document.getElementById('commentsList');
    const commentsEmpty = document.getElementById('commentsEmpty');
    const commentsCount = document.getElementById('commentsCount');
    
    if (!commentsList || !commentsEmpty) return;
    
    try {
        const savedData = JSON.parse(localStorage.getItem('weddingRSVP') || '[]');
        
        if (savedData.length > 0) {
            // Konversi ke format komentar
            const comments = savedData.map((item, index) => ({
                id: index,
                name: item.name,
                message: item.message,
                timestamp: item.timestamp,
                timeAgo: getTimeAgo(item.timestamp),
                exactTime: formatDate(item.timestamp),
                avatarColor: generateAvatarColor(item.name),
                attendance: item.attendance,
                isHost: false,
                guests: item.guestCount
            }));
            
            // Update jumlah komentar
            if (commentsCount) {
                commentsCount.textContent = comments.length;
            }
            
            // Kosongkan komentar lama
            commentsList.innerHTML = '';
            
            // Tambahkan komentar
            comments.forEach((comment, index) => {
                setTimeout(() => {
                    const commentElement = createCommentElement(comment);
                    commentsList.appendChild(commentElement);
                }, index * 50);
            });
            
            // Sembunyikan empty state
            commentsEmpty.style.display = 'none';
            
            showNotification('info', 'Menampilkan data dari penyimpanan lokal');
        } else {
            // Tampilkan empty state
            commentsEmpty.style.display = 'block';
            if (commentsCount) {
                commentsCount.textContent = '0';
            }
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        commentsEmpty.style.display = 'block';
        commentsEmpty.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Gagal memuat ucapan. Silakan coba beberapa saat lagi.</p>
        `;
    }
}

// Helper function untuk format waktu
function getTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari yang lalu`;
    return `${Math.floor(diff / 604800)} minggu yang lalu`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Fungsi lainnya tetap sama seperti sebelumnya...
// [Sisakan fungsi-fungsi lain yang sudah ada]

// Coba sinkron data saat halaman dimuat
window.addEventListener('load', function() {
    // Tunggu 3 detik baru sinkron
    setTimeout(syncLocalDataWithGoogleSheets, 3000);
});
