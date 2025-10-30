// --------------------------------------------------------------------------
// 1. FIREBASE CONFIGURATION & INITIALIZATION (Provided by User)
// --------------------------------------------------------------------------

// Configuration data provided by "गौशाला सेवा समिति सिंगनोर" from Firebase Console.
const firebaseConfig = {
    apiKey: "AIzaSyCKLB7uNvLSw4i7hLf1C6_TZ34Wt0LiHgo",
    authDomain: "gaushalasevasingnor.firebaseapp.com",
    databaseURL: "https://gaushalasevasingnor-default-rtdb.firebaseio.com",
    projectId: "gaushalasevasingnor",
    storageBucket: "gaushalasevasingnor.firebasestorage.app",
    messagingSenderId: "272807907809", 
    appId: "1:272807907809:web:aa71729fecd4296a1bc2a0" 
};

// Global Firebase service instances
let auth, database, storage;

try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
    storage = firebase.storage();
    console.log("Firebase services initialized successfully.");
} catch (error) {
    console.error("Firebase Initialization Error:", error);
    alert("वेबसाइट सेवाओं को लोड करने में समस्या। कृपया कंसोल देखें।");
}


// Global Variables
let currentUserId = null;
let currentMembershipStatus = 'None';
// VPA based on Bank Account Details: Account No.: 46870200000024, IFSC: BARB0BRGBXX
const VPA = "46870200000024@BARB0BRGBXX.bank"; 


// --------------------------------------------------------------------------
// 2. AUTHENTICATION (Login, Signup, Google)
// --------------------------------------------------------------------------

// --- A. Email/Password Signup/Login (FIXED DUPLICATE USER) ---

window.handleSignup = async function(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    // Disable button to prevent double-click duplicate creation attempts
    const signupBtn = e.target.querySelector('button[type="submit"]');
    signupBtn.disabled = true;

    try {
        // FIX: Check if the user already exists (Prevents duplicate creation attempts)
        const methods = await auth.fetchSignInMethodsForEmail(email);
        if (methods && methods.length > 0) {
            alert("यह ईमेल पहले से पंजीकृत है। कृपया लॉगिन करें या किसी अन्य ईमेल का उपयोग करें।");
            switchAuthTab('login');
            return;
        }

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        await database.ref('users/' + userCredential.user.uid).set({
            name: name,
            email: email,
            mobile: 'N/A',
            address: 'N/A',
            membership: 'None', 
            createdAt: new Date().toISOString(),
            totalDonated: 0,
            profilePhotoURL: 'N/A' 
        });
        alert("पंजीकरण सफल! Welcome " + name + "!");
        document.getElementById('signupForm').reset(); 
        hideLoginModal(); 
        showPage('profile');
    } catch (error) {
        alert("पंजीकरण में त्रुटि: " + error.message);
    } finally {
        signupBtn.disabled = false;
    }
}

window.handleLogin = async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        alert("लॉगिन सफल!");
        document.getElementById('loginForm').reset(); 
        hideLoginModal(); 
        showPage('home');
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            alert("यह ईमेल पंजीकृत नहीं है। कृपया साइनअप करें।");
            switchAuthTab('signup');
        } else {
            alert("लॉगिन में त्रुटि: " + error.message);
        }
    }
}

// --- B. Google Login ---
window.signInWithGoogle = async function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        
        if (result.additionalUserInfo.isNewUser) {
            await database.ref('users/' + result.user.uid).set({
                name: result.user.displayName,
                email: result.user.email,
                mobile: result.user.phoneNumber || 'N/A',
                address: 'N/A',
                membership: 'None',
                createdAt: new Date().toISOString(),
                totalDonated: 0,
                profilePhotoURL: result.user.photoURL || 'N/A' 
            });
        }
        alert("Google लॉगिन सफल!");
        hideLoginModal(); 
        showPage('home');
    } catch (error) {
        alert("Google लॉगिन में त्रुटि: " + error.message);
    }
}

// --- C. Password Reset ---
window.handlePasswordReset = async function() {
    const email = prompt("पासवर्ड रीसेट के लिए अपना ईमेल दर्ज करें:");
    if (email) {
        try {
            await auth.sendPasswordResetEmail(email);
            alert("पासवर्ड रीसेट लिंक आपके ईमेल पर भेज दिया गया है।");
        } catch (error) {
            alert("रीसेट ईमेल भेजने में त्रुटि: " + error.message);
        }
    }
}


// --- D. Auth State Listener & Logout (FIXED LOGOUT) ---

firebase.auth().onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('loginBtn');
    const profileBtnContainer = document.getElementById('profileBtnContainer');
    const mobileLoginLink = document.getElementById('mobileLoginLink');
    const mobileProfileLink = document.getElementById('mobileProfileLink');
    const mobileLogoutLink = document.getElementById('mobileLogoutLink');
    const profilePhotoNav = document.getElementById('profilePhotoNav');
    const profileNameNav = document.getElementById('profileNameNav');
    
    if (user) {
        currentUserId = user.uid;
        
        database.ref('users/' + user.uid).once('value', (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                currentMembershipStatus = userData.membership || 'None';
                const photoUrl = userData.profilePhotoURL && userData.profilePhotoURL !== 'N/A' 
                                 ? userData.profilePhotoURL 
                                 : `https://placehold.co/36x36/4CAF50/ffffff?text=${(userData.name || 'U').charAt(0)}`;

                profileNameNav.textContent = userData.name || 'Profile';
                profilePhotoNav.src = photoUrl;
                document.getElementById('profilePhotoLarge').src = photoUrl; 
            }
        });

        // Desktop UI: Hide Login, Show Profile/Logout
        loginBtn.style.display = 'none';
        profileBtnContainer.style.display = 'flex'; 

        // Mobile UI
        mobileLoginLink.style.display = 'none';
        mobileProfileLink.style.display = 'block';
        mobileLogoutLink.style.display = 'block';
        
        loadTopDonors(); 

    } else {
        currentUserId = null;
        currentMembershipStatus = 'None';

        // Desktop UI: Show Login, Hide Profile/Logout
        loginBtn.style.display = 'inline-flex';
        profileBtnContainer.style.display = 'none';
        
        // Mobile UI
        mobileLoginLink.style.display = 'block';
        mobileProfileLink.style.display = 'none';
        mobileLogoutLink.style.display = 'none';
        
        loadTopDonors();
    }
});

// FIX: Logout is now working correctly
window.logoutUser = async function() {
    try {
        // Ensure successful signOut before updating UI
        await auth.signOut();
        alert("आप सफलतापूर्वक लॉगआउट हो गए हैं।");
        // onAuthStateChanged handles UI update automatically and redirects to home
        showPage('home');
    } catch (error) {
        console.error("Logout Error:", error);
        alert("लॉगआउट में त्रुटि: " + error.message);
    }
}


// --------------------------------------------------------------------------
// 3. SINGLE PAGE APPLICATION (SPA) NAVIGATION & UI LOGIC
// --------------------------------------------------------------------------

// FIX: Function to show the Login Modal (Working activation)
window.showLoginModal = function() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('active');
    
    // Default to Login tab
    switchAuthTab('login');
}

// FIX: Function to hide the Login Modal
window.hideLoginModal = function() {
    document.getElementById('loginModal').classList.remove('active');
}


// Function to switch between Login and Signup tabs
window.switchAuthTab = function(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-button[onclick*='${tabId}']`).classList.add('active');
    
    document.querySelectorAll('.auth-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId + 'TabContent').classList.add('active');
}

// Main Navigation Function (Handles scroll to section)
window.showPage = function(pageId) {
    // 1. Handle Login/Signup Modal Display
    if (pageId === 'login') {
        if (currentUserId) {
            // If logged in, redirect to profile instead of showing modal
            pageId = 'profile'; 
        } else {
            // Show the modal
            showLoginModal();
            return; 
        }
    } else {
        // Hide modal if navigating to any other page
        hideLoginModal();
    }

    // 2. Show target section (All other sections)
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(pageId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // 3. Update URL hash & smooth scroll to the section (FIXED SCROLLING)
    window.location.hash = pageId;
    if (targetSection) {
        // Using setTimeout to allow the page section visibility change to render before scrolling
        setTimeout(() => {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100); 
    }

    // 4. Highlight active link and CLOSE MOBILE MENU
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });
    // Close mobile menu on any link click (Fix)
    document.getElementById('mainNav').classList.remove('open');


    // 5. Load page-specific content
    if (pageId === 'profile' && currentUserId) {
        loadUserProfile(currentUserId);
        loadDonationHistory(currentUserId);
    }
}

// Mobile Menu Toggle
window.toggleMobileMenu = function() {
    document.getElementById('mainNav').classList.toggle('open');
}


// Handle Hash Change 
window.addEventListener('hashchange', () => {
    const pageId = window.location.hash.substring(1) || 'home';
    showPage(pageId);
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons(); 
    const pageId = window.location.hash.substring(1) || 'home';
    showPage(pageId);
    
    document.getElementById('loginForm').addEventListener('submit', window.handleLogin);
    document.getElementById('signupForm').addEventListener('submit', window.handleSignup);
    document.getElementById('membershipForm').addEventListener('submit', window.handleMembershipSubmission);
    document.getElementById('contactForm').addEventListener('submit', window.handleContactFormSubmission);
});


// --------------------------------------------------------------------------
// 4. DONATION LOGIC (General Donation)
// --------------------------------------------------------------------------

// Function to generate Dynamic QR Code
window.generateQRCode = function() {
    const amount = document.getElementById('donationAmount').value;
    const qrContainer = document.getElementById('qrcodeContainer');

    if (!amount || amount < 10) {
        qrContainer.innerHTML = '<p class="text-error">कृपया दान की सही राशि दर्ज करें (न्यूनतम ₹10)।</p>';
        return;
    }

    const upiLink = `upi://pay?pa=${VPA}&pn=GaushalaSingnor&am=${amount}&tn=Donation${Date.now()}`;

    qrContainer.innerHTML = ''; 
    
    try {
        new QRCode(qrContainer, {
            text: upiLink,
            width: 200,
            height: 200,
            colorDark : "#333333",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        qrContainer.innerHTML += `<p class="mt-2 text-primary">UPI ऐप से स्कैन करें।</p>`;
    } catch (e) {
        qrContainer.innerHTML = `<p class="text-error">QR Code generation failed. Use the manual link below:</p>
                                 <a href="${upiLink}" target="_blank" class="btn-link">Click to Pay via UPI App</a>`;
        console.error("QR Code Error:", e);
    }
}


// Function to handle Payment Proof Submission (Donation Form)
document.getElementById('donationForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('donorName').value;
    const mobile = document.getElementById('donorMobile').value;
    const txId = document.getElementById('transactionId').value;
    const amount = document.getElementById('donationAmount').value;
    const screenshotFile = document.getElementById('screenshotUpload').files[0];
    const isAnonymous = document.getElementById('isAnonymous').checked;
    
    const donationType = isAnonymous ? 'Gupt Daan' : 'General';


    if (!screenshotFile || !txId || !amount) {
        alert("कृपया ट्रांजेक्शन ID, राशि और स्क्रीनशॉट अनिवार्य रूप से दें।");
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';


    try {
        let downloadURL = 'N/A';
        // 1. Upload Screenshot to Firebase Storage (Requires Blaze Plan - 5GB Free Tier)
        const storageRef = storage.ref(`screenshots/donation_${txId}_${Date.now()}`);
        const snapshot = await storageRef.put(screenshotFile);
        downloadURL = await snapshot.ref.getDownloadURL();

        // 2. Save Donation Data to Firebase Realtime Database
        const newDonationRef = database.ref('donations').push();
        const donationData = {
            donorName: name,
            mobile: mobile,
            transactionId: txId,
            amount: parseFloat(amount),
            screenshotURL: downloadURL,
            timestamp: new Date().toISOString(),
            status: 'Pending Verification', 
            isAnonymous: isAnonymous,
            type: donationType, 
            donorId: currentUserId || 'guest_' + Date.now(), 
            donationID: newDonationRef.key 
        };
        
        await newDonationRef.set(donationData);
        
        // 3. Show Thank You Screen and RESET
        document.getElementById('donationInputs').style.display = 'none';
        document.getElementById('thankYouScreen').style.display = 'block';
        
        document.getElementById('donationForm').reset(); // Form Reset
        document.getElementById('donationAmount').value = 500; // Reset amount input value

    } catch (error) {
        console.error("Donation Submission Error:", error);
        alert("भुगतान विवरण जमा करने में त्रुटि आई। (Storage Blaze Plan सुनिश्चित करें)।");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'भुगतान की पुष्टि करें और डेटा भेजें';
    }
});


// --------------------------------------------------------------------------
// 5. MEMBERSHIP LOGIC (Separate Form and Submission)
// --------------------------------------------------------------------------

window.selectMembership = function(type, amount) {
    if (!currentUserId) {
        alert("कृपया पहले लॉगिन या साइनअप करें।");
        showPage('login'); // Will open modal
        return;
    }
    
    // Show selected membership details and form
    document.getElementById('selectedMembershipTitle').textContent = `${type} सदस्यता: ₹${amount}`;
    document.getElementById('selectedMembershipTitle').style.display = 'block';
    
    document.getElementById('memberAmount').value = amount;
    document.getElementById('memberType').value = type;
    document.getElementById('memberDonorName').value = firebase.auth().currentUser.displayName || ''; // Pre-fill name

    document.getElementById('membershipForm').style.display = 'block';

    // Generate QR code for the exact membership amount in the membership section
    const qrContainer = document.getElementById('membershipQRCodeContainer');
    qrContainer.innerHTML = '';
    
    try {
        new QRCode(qrContainer, {
            text: `upi://pay?pa=${VPA}&pn=GoshalaMember&am=${amount}&tn=${type}Member`,
            width: 150,
            height: 150,
            colorDark : "#333333",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        qrContainer.innerHTML += `<p class="mt-2 text-primary">सदस्यता शुल्क भुगतान के लिए स्कैन करें।</p>`;
    } catch (e) {
        qrContainer.innerHTML = `<p class="text-error">QR Code generation failed. Please use UPI VPA manually.</p>`;
    }
}

window.handleMembershipSubmission = async function(e) {
    e.preventDefault();

    const name = document.getElementById('memberDonorName').value;
    const txId = document.getElementById('memberTransactionId').value;
    const amount = document.getElementById('memberAmount').value;
    const type = document.getElementById('memberType').value;
    const paymentFile = document.getElementById('paymentScreenshotUploadMember').files[0];
    const userPhotoFile = document.getElementById('userPhotoUploadMember').files[0];

    if (!paymentFile || !userPhotoFile || !txId || !amount) {
        alert("सभी फ़ील्ड (स्क्रीनशॉट और फोटो सहित) अनिवार्य हैं।");
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading Proofs...';

    try {
        let paymentURL = 'N/A';
        let photoURL = 'N/A';

        // 1. Upload Payment Screenshot
        const payRef = storage.ref(`screenshots/member_pay_${txId}_${Date.now()}`);
        const paySnapshot = await payRef.put(paymentFile);
        paymentURL = await paySnapshot.ref.getDownloadURL();

        // 2. Upload User Photo
        const photoRef = storage.ref(`member_photos/${currentUserId}_${Date.now()}`);
        const photoSnapshot = await photoRef.put(userPhotoFile);
        photoURL = await photoSnapshot.ref.getDownloadURL();

        // 3. Save Membership Data to RTDB (Pending) - Goes to donations section for admin to view
        const newMemberRef = database.ref('donations').push();
        await newMemberRef.set({
            donorName: name,
            amount: parseFloat(amount),
            transactionId: txId,
            paymentURL: paymentURL,
            userPhotoURL: photoURL,
            timestamp: new Date().toISOString(),
            status: 'Pending Membership', 
            type: type + ' Membership', 
            donorId: currentUserId,
            donationID: newMemberRef.key 
        });

        // 4. Update User Profile with Pending Photo and Status
        await database.ref('users/' + currentUserId).update({
            profilePhotoURL: photoURL,
            membership: 'Pending',
            // Placeholder: Expiry date calculation would be here once confirmed by admin
        });

// 5. Show Thank You Screen and RESET
        document.getElementById('membershipInputs').style.display = 'none';
        document.getElementById('membershipThankYouScreen').style.display = 'block';
        
        document.getElementById('membershipForm').reset(); // Form Reset

    } catch (error) {
        console.error("Membership Submission Error:", error);
        alert("सदस्यता अनुरोध जमा करने में त्रुटि आई। (Storage Blaze Plan सुनिश्चित करें)।");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'सदस्यता अनुरोध जमा करें';
    }
}


// --------------------------------------------------------------------------
// 6. PROFILE LOGIC & MEMBERSHIP EXPIRY (Placeholder for future Cloud Functions)
// --------------------------------------------------------------------------

async function loadUserProfile(uid) {
    const profileRef = database.ref('users/' + uid);
    const profileCard = document.getElementById('profileDetails');
    const badgeArea = document.getElementById('membershipBadgeArea');
    const totalDonated = document.getElementById('totalDonatedAmount');
    const profilePhotoLarge = document.getElementById('profilePhotoLarge');

    profileRef.on('value', (snapshot) => {
        const user = snapshot.val();
        if (user) {
            // Check Membership Expiry (Client-Side Placeholder - Needs Cloud Function in production)
            if (user.membership === 'Premium' && user.membershipExpiryDate) {
                 const expiry = new Date(user.membershipExpiryDate);
                 if (expiry < new Date()) {
                     user.membership = 'None';
                     // In production, this update MUST be done by a Firebase Cloud Function (Cron Job)
                     profileRef.update({ membership: 'None' }); 
                 }
            }


            // Display User Details
            profileCard.innerHTML = `
                <h3 class="section-subtitle">${user.name || 'Anonymous User'}</h3>
                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                <p><strong>Mobile:</strong> ${user.mobile || 'N/A'}</p>
                <p><strong>Address:</strong> ${user.address || 'N/A'}</p>
                <button class="btn btn-secondary mt-3" onclick="openEditProfileModal()">Edit Profile</button>
            `;

            // Display Total Donation Amount
            totalDonated.textContent = `कुल दान: ₹${(user.totalDonated || 0).toFixed(2)}`;

            // Profile Photo Update
            const photoUrl = user.profilePhotoURL && user.profilePhotoURL !== 'N/A' 
                                ? user.profilePhotoURL 
                                : `https://placehold.co/100x100/4CAF50/ffffff?text=${(user.name || 'U').charAt(0)}`;
            profilePhotoLarge.src = photoUrl;
            document.getElementById('profilePhotoNav').src = photoUrl;


            // Membership Badge Logic
            const isPremium = user.membership === 'Premium';
            const isPending = user.membership === 'Pending';

            if (isPremium) {
                 badgeArea.innerHTML = `<div class="premium-badge">Goshala Premium Member <i data-lucide="star"></i></div>`;
            } else if (isPending) {
                 badgeArea.innerHTML = `<div class="non-member-status status-indicator text-secondary">Membership: Pending Approval</div>`;
            } else {
                 badgeArea.innerHTML = `<div class="non-member-status">Not a Premium Member. <button class="btn-link" onclick="showPage('membership')">Join Now</button></div>`;
            }

             lucide.createIcons();
        }
    });

    // Edit Profile Modal function
    window.openEditProfileModal = function() {
        profileRef.once('value', (snapshot) => {
            const user = snapshot.val();
            const newName = prompt("Enter new Name:", firebase.auth().currentUser.displayName || '');
            const newMobile = prompt("Enter new Mobile:", user.mobile || '');
            const newAddress = prompt("Enter new Address:", user.address || '');

            if (newName && newMobile && newAddress) {
                profileRef.update({ name: newName, mobile: newMobile, address: newAddress })
                    .then(() => alert("Profile updated successfully!"))
                    .catch(err => console.error("Update error:", err));
            }
        });
    }
}

async function loadDonationHistory(uid) {
    const historyList = document.getElementById('donationHistoryList');
    // Order by timestamp and filter by the current user's ID
    const donorHistoryRef = database.ref('donations').orderByChild('donorId').equalTo(uid);
    
    donorHistoryRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            historyList.innerHTML = "<p>अभी तक कोई दान नहीं दिया गया है।</p>";
            return;
        }

        let historyHTML = '';
        snapshot.forEach(child => {
            const donation = child.val();
            const date = new Date(donation.timestamp).toLocaleDateString('hi-IN');
// Status styling
            const statusClass = donation.status === 'Approved' ? 'text-primary' : (donation.status.includes('Pending') ? 'text-secondary' : 'text-danger');

            historyHTML += `
                <div class="donation-item section-card">
                    <p><strong>राशि:</strong> ₹${donation.amount} (${donation.type})</p>
                    <p><strong>तारीख:</strong> ${date}</p>
                    <p class="status-indicator ${statusClass}"><strong>स्थिति:</strong> ${donation.status}</p>
                </div>
            `;
        });

        historyList.innerHTML = historyHTML;
    });
}


// --------------------------------------------------------------------------
// 7. DYNAMIC CONTENT LOADING (Top Donors)
// --------------------------------------------------------------------------

function loadTopDonors() {
    const sliderContainer = document.getElementById('topDonorsSlider');
    sliderContainer.innerHTML = '<p style="padding: 0 10px;">Loading donors list...</p>';

    // Fetch up to 30 donors who are not anonymous and are approved
    database.ref('donations')
        .orderByChild('status')
        .equalTo('Approved')
        .limitToLast(30)
        .once('value', (snapshot) => {
            let donorCardsHTML = '';
            snapshot.forEach(child => {
                const donation = child.val();
                if (!donation.isAnonymous) {
                    // Placeholder for image
                    const imageUrl = `https://placehold.co/60x60/FF9800/ffffff?text=${(donation.donorName || 'D').charAt(0)}`;
                    donorCardsHTML += `
                        <div class="donor-card">
                            <img src="${imageUrl}" alt="${donation.donorName}">
                            <p>${donation.donorName}</p>
                        </div>
                    `;
                }
            });

            if (donorCardsHTML) {
                // Duplicate content for smooth infinite scrolling effect
                sliderContainer.innerHTML = donorCardsHTML + donorCardsHTML;
            } else {
                sliderContainer.innerHTML = '<p style="padding: 0 10px;">अभी तक कोई दानकर्ता उपलब्ध नहीं है।</p>';
            }
        });
}

// Contact Form Submission (Uses mailto for free submission)
window.handleContactFormSubmission = function(e) {
    e.preventDefault();
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const message = document.getElementById('contactMessage').value;

    const subject = `New Contact Form Submission from ${name}`;
    const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

// Use mailto: for free email submission to ys0224379@gmail.com
    window.location.href = `mailto:ys0224379@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    document.getElementById('contactForm').reset();
    alert("आपका संदेश ईमेल ऐप में खुल गया है। कृपया भेजने के लिए 'Send' पर क्लिक करें।");
};


window.onload = function() {
    loadTopDonors();
};
                         
