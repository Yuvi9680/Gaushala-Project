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
    // Use custom modal or message box instead of alert() if possible in real app
    alert("वेबसाइट सेवाओं को लोड करने में समस्या। कृपया कंसोल देखें।");
}


// Global Variables
let currentUserId = null;
let currentMembershipStatus = 'None';
const VPA = "yourgoshala@upi"; // <--- गौशाला का VPA यहाँ बदलें (e.g., upi@bank)


// --------------------------------------------------------------------------
// 2. AUTHENTICATION (Login, Signup, Google)
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
        await database.ref('users/' + userCredential.user.uid).set({
            name: name,
            email: email,
            mobile: 'N/A',
            address: 'N/A',
            membership: 'None', 
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
        // Smart Auth Logic: If user not found, redirect to signup automatically
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
        
        // Check if user is new, then create profile data
        if (result.additionalUserInfo.isNewUser) {
            await database.ref('users/' + result.user.uid).set({
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
        
        loadTopDonors(); 

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
    lucide.createIcons(); 
    showPage('home');
}


// --------------------------------------------------------------------------
// 3. SINGLE PAGE APPLICATION (SPA) NAVIGATION & UI LOGIC
// --------------------------------------------------------------------------

// Function to switch between Login and Signup tabs
window.switchAuthTab = function(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-button[onclick*='${tabId}']`).classList.add('active');
    
    document.querySelectorAll('.auth-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId + 'TabContent').classList.add('active');
}

// Main Navigation Function
window.showPage = function(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(pageId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    window.location.hash = pageId;

    // Highlight active link in header
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });

    // Load page-specific content
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
});


// --------------------------------------------------------------------------
// 4. DONATION & QR CODE GENERATION LOGIC
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
        
        // 3. Update User's Total Donated Amount 
        if (currentUserId) {
            const userRef = database.ref('users/' + currentUserId);
            userRef.child('totalDonated').transaction((currentTotal) => {
                return (currentTotal || 0) + parseFloat(amount);
            });
            if (isMembership) {
                 userRef.update({ 
                    membership: 'Premium', 
                    lastMembershipPayment: new Date().toISOString(),
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
// 5. MEMBERSHIP & PROFILE LOGIC
// --------------------------------------------------------------------------

window.selectMembership = function(type, amount) {
    if (!currentUserId) {
        alert("कृपया पहले लॉगिन या साइनअप करें।");
        showPage('login');
        return;
    }
    
    showPage('donation');
    document.getElementById('donationAmount').value = amount;
    
    document.getElementById('donationForm').setAttribute('data-type', 'membership');

    generateQRCode();
    alert(`आपने ${type} सदस्यता (₹${amount}) चुनी है। अब भुगतान करें और प्रमाण अपलोड करें।`);
}

async function loadUserProfile(uid) {
    const profileRef = database.ref('users/' + uid);
    const profileCard = document.getElementById('profileDetails');
    const badgeArea = document.getElementById('membershipBadgeArea');
    const totalDonated = document.getElementById('totalDonatedAmount');

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
            
            // Display Total Donation Amount
            totalDonated.textContent = `कुल दान: ₹${(user.totalDonated || 0).toFixed(2)}`;

            // Membership Badge Logic
            const isPremium = user.membership === 'Premium';
            badgeArea.innerHTML = isPremium 
                ? `<div class="premium-badge">Goshala Premium Member <i data-lucide="star"></i></div>`
                : `<div class="non-member-status">Not a Premium Member. <button class="btn-link" onclick="showPage('membership')">Join Now</button></div>`;
             lucide.createIcons();
        }
    });

    // Edit Profile Modal function
    window.openEditProfileModal = function() {
        const user = profileRef.toJSON(); // Get current user data
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
            const statusClass = donation.status === 'Approved' ? 'text-primary' : 'text-secondary';

            historyHTML += `
                <div class="donation-item section-card">
                    <p><strong>राशि:</strong> ₹${donation.amount}</p>
                    <p><strong>तारीख:</strong> ${date}</p>
                    <p><strong>प्रकार:</strong> ${donation.type}</p>
                    <p class="status-indicator ${statusClass}"><strong>स्थिति:</strong> ${donation.status}</p>
                </div>
            `;
        });

        historyList.innerHTML = historyHTML;
    });
}


// --------------------------------------------------------------------------
// 6. DYNAMIC CONTENT LOADING (Top Donors & Content Snippets)
// --------------------------------------------------------------------------

function loadTopDonors() {
    // This function needs to fetch and display data dynamically.
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
                    // Placeholder for image, replace with user uploaded image if available in storage later
                    const imageUrl = `https://placehold.co/60x60/FF9800/ffffff?text=${donation.donorName[0]}`;
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

window.onload = function() {
    loadTopDonors();
};
