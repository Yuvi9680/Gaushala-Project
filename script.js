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
const VPA = "yourgoshala@upi"; // <--- गौशाला का VPA यहाँ बदलें

// Global confirmation result for phone auth (needed for 2-step verification)
let confirmationResult = null;


// --------------------------------------------------------------------------
// 2. AUTHENTICATION (Login, Signup, Google, Phone OTP)
// --------------------------------------------------------------------------

// --- A. Email/Password Signup/Login ---

window.handleSignup = async function(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        // Save initial user data to Realtime Database
        database.ref('users/' + userCredential.user.uid).set({
            name: name,
            email: email,
            mobile: 'N/A',
            address: 'N/A',
            membership: 'None', // Default status
            createdAt: new Date().toISOString(),
            totalDonated: 0
        });
        alert("पंजीकरण सफल! Welcome " + name + "!");
        showPage('profile');
    } catch (error) {
        alert("पंजीकरण में त्रुटि: " + error.message);
    }
}

window.handleLogin = async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        alert("लॉगिन सफल!");
        showPage('home');
    } catch (error) {
        alert("लॉगिन में त्रुटि: " + error.message);
    }
}

// --- B. Google Login ---
window.signInWithGoogle = async function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        
        // Check if user is new, then create profile data
        if (result.additionalUserInfo.isNewUser) {
            database.ref('users/' + result.user.uid).set({
                name: result.user.displayName,
                email: result.user.email,
                mobile: result.user.phoneNumber || 'N/A',
                address: 'N/A',
                membership: 'None',
                createdAt: new Date().toISOString(),
                totalDonated: 0
            });
        }
        alert("Google लॉगिन सफल!");
        showPage('home');
    } catch (error) {
        alert("Google लॉगिन में त्रुटि: " + error.message);
    }
}

// --- C. Phone OTP Authentication (With reCAPTCHA) ---

// Setup reCAPTCHA Verifier on page load
window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    'size': 'invisible', // Invisible reCAPTCHA is better for UX
    'callback': (response) => {
        // reCAPTCHA solved, but we handle logic in sendOTP function
    },
    'expired-callback': () => {
        // User timeout
        alert("CAPTCHA सत्र समाप्त हो गया है, कृपया पुनः प्रयास करें।");
    }
});
recaptchaVerifier.render(); // Render the invisible captcha

window.sendOTP = async function(e) {
    e.preventDefault();
    const phoneNumber = document.getElementById('phoneNumber').value;
    const phoneAuthForm = document.getElementById('phoneAuthForm');
    const otpForm = document.getElementById('otpForm');

    try {
        // Send the OTP
        confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier);
        
        // Switch to OTP input form
        alert("OTP भेजा गया है।");
        phoneAuthForm.style.display = 'none';
        otpForm.style.display = 'block';
    } catch (error) {
        console.error("OTP Error:", error);
        alert("OTP भेजने में त्रुटि: " + error.message);
        window.recaptchaVerifier.render(); // Reset reCAPTCHA on error
    }
}

window.verifyOTP = async function(e) {
    e.preventDefault();
    const code = document.getElementById('verificationCode').value;

    if (!confirmationResult) {
        alert("पहले OTP भेजने का प्रयास करें।");
        return;
    }

    try {
        const result = await confirmationResult.confirm(code);
        // Check if user is new, then create profile data
        if (result.additionalUserInfo.isNewUser) {
             database.ref('users/' + result.user.uid).set({
                name: 'OTP User',
                email: result.user.email || 'N/A',
                mobile: result.user.phoneNumber,
                address: 'N/A',
                membership: 'None',
                createdAt: new Date().toISOString(),
                totalDonated: 0
            });
        }
        alert("OTP Verification सफल!");
        showPage('home');
    } catch (error) {
        alert("OTP सत्यापन में त्रुटि: " + error.message);
    }
}

// --- D. Auth State Listener & Logout ---

firebase.auth().onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('loginBtn');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (user) {
        currentUserId = user.uid;
        
        // Read user data once to set name/membership for UI
        database.ref('users/' + user.uid).once('value', (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                currentMembershipStatus = userData.membership || 'None';
                profileBtn.innerHTML = `<i data-lucide="user"></i> ${userData.name || 'Profile'}`;
            }
        });

        loginBtn.style.display = 'none';
        profileBtn.style.display = 'inline-flex';
        logoutBtn.style.display = 'inline-flex';
        
        loadTopDonors(); // Load dynamic data once user is known

    } else {
        currentUserId = null;
        currentMembershipStatus = 'None';
        loginBtn.style.display = 'inline-flex';
        profileBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
        
        loadTopDonors();
    }
});

window.logoutUser = async function() {
    await auth.signOut();
    alert("आप सफलतापूर्वक लॉगआउट हो गए हैं।");
    // Reload icons after logout, as the user button icon changes
    lucide.createIcons(); 
    showPage('home');
}


// --------------------------------------------------------------------------
// 4. SINGLE PAGE APPLICATION (SPA) NAVIGATION & DYNAMIC CONTENT
// --------------------------------------------------------------------------

// Main Navigation Function (uses window scope for easy HTML access)
window.showPage = function(pageId) {
    // Logic to hide/show sections and update URL hash (same as previous plan)
    // ...
    
    // Load page-specific content
    if (pageId === 'profile' && currentUserId) {
        loadUserProfile(currentUserId);
        loadDonationHistory(currentUserId);
    }
    // ...
}

// Handle Hash Change (same as previous plan)
window.addEventListener('hashchange', () => {
    const pageId = window.location.hash.substring(1) || 'home';
    showPage(pageId);
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons(); // Initialize icons
    const pageId = window.location.hash.substring(1) || 'home';
    showPage(pageId);
    
    // Setup event listeners for forms defined outside the main script flow
    document.getElementById('loginForm').addEventListener('submit', window.handleLogin);
    document.getElementById('signupForm').addEventListener('submit', window.handleSignup);
});


// --------------------------------------------------------------------------
// 5. DONATION & QR CODE GENERATION LOGIC
// --------------------------------------------------------------------------

// Function to generate Dynamic QR Code (same as previous plan)
window.generateQRCode = function() {
    // ... [Logic for QR Code generation using VPA and donationAmount]
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
    
    // Membership logic check
    const isMembership = e.target.getAttribute('data-type') === 'membership';
    const donationType = isMembership ? 'Membership' : (isAnonymous ? 'Gupt Daan' : 'General');


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
        const storageRef = storage.ref(`screenshots/${txId}_${Date.now()}`);
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
        
        // 3. Update User's Total Donated Amount (Transactionally safe update)
        if (currentUserId) {
            const userRef = database.ref('users/' + currentUserId);
            userRef.child('totalDonated').transaction((currentTotal) => {
                return (currentTotal || 0) + parseFloat(amount);
            });
            // Update membership status if applicable (Admin will confirm expiry date later)
            if (isMembership) {
                 userRef.update({ 
                    membership: 'Premium', 
                    lastMembershipPayment: new Date().toISOString(),
                    // Expiry Date logic MUST be handled by admin or cloud function
                 });
            }
        }
        
        // 4. Show Thank You Screen 
        document.getElementById('donationInputs').style.display = 'none';
        document.getElementById('thankYouScreen').style.display = 'block';
        
        // Reset button and form
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Payment Proof';
        document.getElementById('donationForm').reset();
        
    } catch (error) {
        console.error("Donation Submission Error:", error);
        alert("भुगतान विवरण जमा करने में त्रुटि आई। (Storage Blaze Plan सुनिश्चित करें)।");
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Payment Proof';
    }
});


// --------------------------------------------------------------------------
// 6. MEMBERSHIP LOGIC
// --------------------------------------------------------------------------

window.selectMembership = function(type, amount) {
    if (!currentUserId) {
        alert("कृपया पहले लॉगिन या साइनअप करें।");
        showPage('login');
        return;
    }
    
    // Redirect to donation page with membership details pre-filled
    showPage('donation');
    document.getElementById('donationAmount').value = amount;
    
    // Mark the form for membership submission
    document.getElementById('donationForm').setAttribute('data-type', 'membership');

    // Generate QR code for the membership amount
    generateQRCode();
    alert(`आपने ${type} सदस्यता (₹${amount}) चुनी है। अब भुगतान करें और प्रमाण अपलोड करें।`);
}

// --------------------------------------------------------------------------
// 7. USER PROFILE LOGIC (LOAD, HISTORY, MEMBERSHIP)
// --------------------------------------------------------------------------

async function loadUserProfile(uid) {
    const profileRef = database.ref('users/' + uid);
    const profileCard = document.getElementById('profileDetails');
    const badgeArea = document.getElementById('membershipBadgeArea');

    profileCard.innerHTML = "<p>Loading profile...</p>";

    profileRef.on('value', (snapshot) => {
        const user = snapshot.val();
        if (user) {
            // Display User Details
            profileCard.innerHTML = `
                <h3 class="section-subtitle">${user.name || 'Anonymous User'}</h3>
                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                <p><strong>Mobile:</strong> ${user.mobile || 'N/A'}</p>
                <p><strong>Address:</strong> ${user.address || 'N/A'}</p>
                <button class="btn btn-secondary mt-3" onclick="openEditProfileModal()">Edit Profile</button>
            `;
            
            // Membership Badge Logic
            const isPremium = user.membership === 'Premium';
            badgeArea.innerHTML = isPremium 
                ? `<div class="premium-badge">Goshala Premium Member <i data-lucide="star"></i></div>`
                : `<div class="non-member-status">Not a Premium Member. <button class="btn-link" onclick="showPage('membership')">Join Now</button></div>`;
             lucide.createIcons(); // Re-render icons after adding HTML
        }
    });

    // Edit Profile Modal function
    window.openEditProfileModal = function() {
        const newName = prompt("Enter new Name:", user.name || '');
        const newMobile = prompt("Enter new Mobile:", user.mobile || '');
        const newAddress = prompt("Enter new Address:", user.address || '');

        if (newName && newMobile && newAddress) {
            profileRef.update({ name: newName, mobile: newMobile, address: newAddress })
                .then(() => alert("Profile updated successfully!"))
                .catch(err => console.error("Update error:", err));
        }
    }
}

async function loadDonationHistory(uid) {
    // ... [Logic to load and display history, filtering by status='Approved' and donorId=uid]
}


// 8. DYNAMIC CONTENT LOADING (Top Donors & Content Snippets)
// --------------------------------------------------------------------------

function loadTopDonors() {
    // ... [Logic to fetch and display Top 30 donors with infinite scroll animation]
}

window.onload = function() {
    loadTopDonors();
    // Load Events/Blogs snippets from /content/events, /content/blogs
};
