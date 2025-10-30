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
            totalDonated: 0,
            profilePhotoURL: 'N/A' // Placeholder for photo
        });
        alert("पंजीकरण सफल! Welcome " + name + "!");
        document.getElementById('signupForm').reset(); // Form Reset
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
        document.getElementById('loginForm').reset(); // Form Reset
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
                totalDonated: 0,
                profilePhotoURL: result.user.photoURL || 'N/A' // Use Google Photo if available
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
    const profileBtnContainer = document.getElementById('profileBtnContainer');
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
                document.getElementById('profilePhotoLarge').src = photoUrl; // Update large photo
            }
        });

        loginBtn.style.display = 'none';
        profileBtnContainer.style.display = 'flex'; // Use flex for better layout
        
        loadTopDonors(); 

    } else {
        currentUserId = null;
        currentMembershipStatus = 'None';
        loginBtn.style.display = 'inline-flex';
        profileBtnContainer.style.display = 'none';
        
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

    // Highlight active link in header AND close mobile menu
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
        // Fix: Close mobile menu on any link click
        document.getElementById('mainNav').classList.remove('open');
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
    document.getElementById('membershipForm').addEventListener('submit', window.handleMembershipSubmission);
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
        showPage('login');
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
        paymentURL = (await payRef.put(paymentFile)).ref.getDownloadURL();

        // 2. Upload User Photo
        const photoRef = storage.ref(`member_photos/${currentUserId}_${Date.now()}`);
        photoURL = (await photoRef.put(userPhotoFile)).ref.getDownloadURL();

        // Wait for both URLs
        const [finalPaymentURL, finalPhotoURL] = await Promise.all([paymentURL, photoURL]);
        
        // 3. Save Membership Data to RTDB (Pending)
        const newMemberRef = database.ref('donations').push();
        await newMemberRef.set({
            donorName: name,
            amount: parseFloat(amount),
            transactionId: txId,
            paymentURL: finalPaymentURL,
            userPhotoURL: finalPhotoURL,
            timestamp: new Date().toISOString(),
            status: 'Pending Membership', 
            type: type + ' Membership', 
            donorId: currentUserId,
            donationID: newMemberRef.key 
        });

        // 4. Update User Profile with Pending Photo (Optional)
        await database.ref('users/' + currentUserId).update({
            profilePhotoURL: finalPhotoURL,
            membership: 'Pending'
        });


        // 5. Show Thank You Screen and RESET
        document.getElementById('membershipInputs').style.display = 'none';
        document.getElementById('membershipThankYouScreen').style.display = 'block';
        
        document.getElementById('membershipForm').reset(); 

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
            badgeArea.innerHTML = isPremium 
                ? `<div class="premium-badge">Goshala Premium Member <i data-lucide="star"></i></div>`
                : `<div class="non-member-status">Not a Premium Member. <button class="btn-link" onclick="showPage('membership')">Join Now</button></div>`;
             lucide.createIcons();
        }
    });

    // Edit Profile Modal function
    window.openEditProfileModal = function() {
        // Simple prompt for mobile environment
        const newName = prompt("Enter new Name:", firebase.auth().currentUser.displayName || '');
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
            const statusClass = donation.status === 'Approved' ? 'text-primary' : (donation.status === 'Pending Verification' ? 'text-secondary' : 'text-danger');

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

window.onload = function() {
    loadTopDonors();
};
             
