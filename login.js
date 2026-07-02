/*
 * Blood Bridge - Login System
 * With auto-dismiss alerts, theme toggle, and language switcher
 */

(function() {
    'use strict';

    // ===== LANGUAGE DATA =====
    var translations = {
        en: {
            emailLabel: 'Email Address',
            emailPlaceholder: 'Enter your email address',
            passwordLabel: 'Password',
            passwordPlaceholder: 'Enter your password',
            rememberMe: 'Remember Me',
            forgotPassword: 'Forgot Password?',
            signUp: 'Sign Up',
            loginBtn: 'Login',
            dividerText: 'or continue with',
            googleBtn: 'Google',
            githubBtn: 'GitHub',
            title: 'BloodBridge Login',
            subtitle: 'Real-time Blood Donation & Distribution System',
            invalidEmail: 'Please enter a valid email address.',
            emptyPassword: 'Please enter your password.',
            shortPassword: 'Password must be at least 8 characters.',
            emptyEmail: 'Please enter your email address.',
            loggingIn: 'Logging in...',
            themeLight: 'Light',
            themeDark: 'Dark',
            langEn: 'EN',
            langBn: 'বাং'
        },
        bn: {
            emailLabel: 'ইমেইল ঠিকানা',
            emailPlaceholder: 'আপনার ইমেইল ঠিকানা লিখুন',
            passwordLabel: 'পাসওয়ার্ড',
            passwordPlaceholder: 'আপনার পাসওয়ার্ড লিখুন',
            rememberMe: 'মনে রাখুন',
            forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
            signUp: 'নিবন্ধন করুন',
            loginBtn: 'লগইন',
            dividerText: 'অথবা এর মাধ্যমে চালিয়ে যান',
            googleBtn: 'গুগল',
            githubBtn: 'গিটহাব',
            title: 'ব্লাডব্রিজ লগইন',
            subtitle: 'রিয়েল-টাইম রক্তদান ও বিতরণ ব্যবস্থা',
            invalidEmail: 'দয়া করে একটি সঠিক ইমেইল ঠিকানা লিখুন।',
            emptyPassword: 'দয়া করে আপনার পাসওয়ার্ড লিখুন।',
            shortPassword: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।',
            emptyEmail: 'দয়া করে আপনার ইমেইল ঠিকানা লিখুন।',
            loggingIn: 'লগইন হচ্ছে...',
            themeLight: 'আলো',
            themeDark: 'অন্ধকার',
            langEn: 'EN',
            langBn: 'বাং'
        }
    };

    var currentLang = localStorage.getItem('bloodbridge_lang') || 'en';
    // Default is DARK. If user has never toggled, start dark. 
    // stored value 'light' means light is active. null/undefined/'dark' means dark.
    var currentTheme = localStorage.getItem('bloodbridge_theme') || 'dark';

    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLogin);
    } else {
        initLogin();
    }

    function initLogin() {
        // Apply saved theme immediately (default dark)
        applyTheme(currentTheme);

        // Get elements
        var emailInput = document.getElementById('email');
        var passwordInput = document.getElementById('password');
        var togglePassword = document.getElementById('togglePassword');
        var eyeOpen = document.getElementById('eyeOpen');
        var eyeClosed = document.getElementById('eyeClosed');
        var loginForm = document.getElementById('loginForm');
        var loginBtn = document.getElementById('loginBtn');
        var messageArea = document.getElementById('messageArea');
        var rememberCheckbox = document.getElementById('remember');
        var rememberWrap = document.querySelector('.remember-wrap');

        // Build toggle bar
        buildToggleBar();

        // Apply saved language
        applyLanguage(currentLang);

        // CRITICAL checks
        if (!passwordInput) {
            console.error('[BloodBridge] CRITICAL: Password input not found!');
            showError('System error: Password field not found. Please refresh the page.');
            return;
        }
        if (!emailInput) {
            console.error('[BloodBridge] CRITICAL: Email input not found!');
            showError('System error: Email field not found. Please refresh the page.');
            return;
        }
        if (!loginForm) {
            console.error('[BloodBridge] CRITICAL: Login form not found!');
            showError('System error: Form not found. Please refresh the page.');
            return;
        }

        // ===== AUTO LOGIN VIA REMEMBER ME =====
        tryAutoLogin();

        // ===== PASSWORD TOGGLE =====
        if (togglePassword) {
            togglePassword.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var currentType = passwordInput.getAttribute('type');
                var newType = (currentType === 'password') ? 'text' : 'password';
                passwordInput.setAttribute('type', newType);
                if (eyeOpen && eyeClosed) {
                    eyeOpen.style.display = (newType === 'text') ? 'block' : 'none';
                    eyeClosed.style.display = (newType === 'text') ? 'none' : 'block';
                }
            });
        }

        // ===== FORM SUBMISSION =====
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            var email = '';
            var passwordValue = '';
            var remember = false;

            try {
                email = emailInput.value.trim();
                passwordValue = passwordInput.value.trim();
                remember = rememberCheckbox ? rememberCheckbox.checked : false;
            } catch (err) {
                showError('System error reading form values. Please refresh.');
                return;
            }

            clearMessages();

            var t = translations[currentLang];

            if (!email) {
                showError(t.emptyEmail);
                emailInput.focus();
                return;
            }
            if (!isValidEmail(email)) {
                showError(t.invalidEmail);
                emailInput.focus();
                return;
            }
            if (!passwordValue) {
                showError(t.emptyPassword);
                passwordInput.focus();
                return;
            }
            // FIXED: Minimum 8 characters
            if (passwordValue.length < 8) {
                showError(t.shortPassword);
                passwordInput.focus();
                return;
            }

            var originalText = loginBtn ? loginBtn.textContent : t.loginBtn;
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.textContent = t.loggingIn;
            }

            var formData = new FormData();
            formData.append('email', email);
            formData.append('password', passwordValue);
            formData.append('remember', remember ? '1' : '0');

            fetch('login.php', {
                method: 'POST',
                body: formData
            })
            .then(function(response) {
                var contentType = response.headers.get('content-type');
                if (!contentType || contentType.indexOf('application/json') === -1) {
                    return response.text().then(function(text) {
                        throw new Error('Server error: ' + text.substring(0, 200));
                    });
                }
                return response.json();
            })
            .then(function(result) {
                if (!result.success) {
                    if (result.not_verified) {
                        showNotVerified(result.message || 'Please verify your email first.');
                    } else {
                        throw new Error(result.message || 'Login failed');
                    }
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.textContent = originalText;
                    }
                    return;
                }
                showSuccess(result.message || 'Login successful!');
                setTimeout(function() {
                    ['bbAdminPage','bbBankPage','bbDrPage','bbMcPage','bbHospPage','bbDocPage','bbLabPage','bbDelPage'].forEach(k => localStorage.removeItem(k));
                    window.location.href = result.redirect || 'donor_recipient_dash.html';
                }, 1000);
            })
            .catch(function(error) {
                showError(error.message || 'An error occurred. Please try again.');
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = originalText;
                }
            });
        });

        // ===== THEME & LANGUAGE TOGGLE BAR =====
        function buildToggleBar() {
            var bar = document.createElement('div');
            bar.className = 'toggle-bar';
            bar.innerHTML = 
                '<a id="homeBtn" class="toggle-btn" href="landing_page.html" title="Home">' +
                    '<span>🏠</span>' +
                '</a>' +
                '<button id="themeToggle" class="toggle-btn" title="Toggle Theme">' +
                    '<span id="themeIcon">☀️</span>' +
                '</button>' +
                '<button id="langToggle" class="toggle-btn" title="Switch Language">' +
                    '<span id="langLabel">বাং</span>' +
                '</button>';

            document.body.insertBefore(bar, document.body.firstChild);

            document.getElementById('themeToggle').addEventListener('click', function() {
                currentTheme = (currentTheme === 'dark') ? 'light' : 'dark';
                localStorage.setItem('bloodbridge_theme', currentTheme);
                applyTheme(currentTheme);
            });

            document.getElementById('langToggle').addEventListener('click', function() {
                currentLang = (currentLang === 'en') ? 'bn' : 'en';
                localStorage.setItem('bloodbridge_lang', currentLang);
                applyLanguage(currentLang);
            });
        }

        function applyTheme(theme) {
            var themeIcon = document.getElementById('themeIcon');
            if (theme === 'light') {
                document.body.classList.add('light-theme');
                if (themeIcon) themeIcon.textContent = '🌙'; // Light mode active → show moon to go dark
            } else {
                document.body.classList.remove('light-theme');
                if (themeIcon) themeIcon.textContent = '☀️'; // Dark mode active → show sun to go light
            }
        }

        function applyLanguage(lang) {
            var t = translations[lang];
            var langLabel = document.getElementById('langLabel');
            if (langLabel) langLabel.textContent = (lang === 'en') ? 'বাং' : 'EN';

            var emailLabel = document.querySelector('label[for="email"]');
            if (emailLabel) emailLabel.textContent = t.emailLabel;

            var passwordLabel = document.querySelector('label[for="password"]');
            if (passwordLabel) passwordLabel.textContent = t.passwordLabel;

            if (emailInput) emailInput.placeholder = t.emailPlaceholder;
            if (passwordInput) passwordInput.placeholder = t.passwordPlaceholder;

            var rememberLabel = document.querySelector('.remember-label');
            if (rememberLabel) {
                rememberLabel.textContent = t.rememberMe;
            }

            var forgotLink = document.querySelector('a[href="forgot_password.html"]');
            if (forgotLink) forgotLink.textContent = t.forgotPassword;

            var signupLink = document.querySelector('a[href="signup.html"]');
            if (signupLink) signupLink.textContent = t.signUp;

            if (loginBtn) loginBtn.textContent = t.loginBtn;

            var dividerSpan = document.querySelector('.divider span');
            if (dividerSpan) dividerSpan.textContent = t.dividerText;

            // Update social buttons text while preserving SVG icons
            var googleBtn = document.getElementById('googleBtn');
            if (googleBtn) {
                var svg = googleBtn.querySelector('svg');
                googleBtn.innerHTML = '';
                if (svg) googleBtn.appendChild(svg);
                googleBtn.appendChild(document.createTextNode(' ' + t.googleBtn));
            }

            var githubBtn = document.getElementById('githubBtn');
            if (githubBtn) {
                var svg = githubBtn.querySelector('svg');
                githubBtn.innerHTML = '';
                if (svg) githubBtn.appendChild(svg);
                githubBtn.appendChild(document.createTextNode(' ' + t.githubBtn));
            }

            document.title = t.title;
            var subtitle = document.querySelector('.logo-section p');
            if (subtitle) subtitle.textContent = t.subtitle;
        }

        // ===== ALERT SYSTEM WITH AUTO-DISMISS & CLOSE BUTTON =====
        function showError(message) {
            clearMessages();
            createAlert(message, 'error');
        }

        function showSuccess(message) {
            clearMessages();
            createAlert(message, 'success');
        }

        function showNotVerified(message) {
            clearMessages();
            var wrapper = document.querySelector('.login-box');
            if (!wrapper) return;
            var alertDiv = document.createElement('div');
            alertDiv.className = 'login-message error';
            alertDiv.innerHTML =
                '<div style="display:flex;align-items:flex-start;gap:10px;">' +
                    '<span style="font-size:20px;flex-shrink:0;">⚠️</span>' +
                    '<div>' +
                        '<p style="margin:0 0 6px;font-weight:600;font-size:0.9rem;">' + message + '</p>' +
                        '<p style="margin:0 0 10px;font-size:0.82rem;color:rgba(245,240,238,0.6);">' +
                            'You need to verify your email address before you can sign in.' +
                        '</p>' +
                        '<button onclick="resendVerification()" style="' +
                            'padding:8px 18px;border-radius:50px;background:linear-gradient(135deg,#C0162C,#8B0020);' +
                            'color:#fff;border:none;cursor:pointer;font-size:0.82rem;font-weight:600;' +
                            'font-family:\'Outfit\',sans-serif;transition:all 0.3s;"' +
                            ' onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 4px 16px rgba(192,22,44,0.4)\';"' +
                            ' onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\';"' +
                        '>Resend Verification Email</button>' +
                    '</div>' +
                '</div>';
            wrapper.insertBefore(alertDiv, wrapper.firstChild);
        }

        window.resendVerification = function() {
            var email = document.getElementById('email')?.value;
            if (!email) { showError('Please enter your email first.'); return; }
            var btn = document.querySelector('.login-message.error button');
            if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
            fetch('resend_verification.php', {
                method: 'POST',
                body: new URLSearchParams({ email: email })
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                if (d.success) {
                    showSuccess('✓ Verification email resent! Check your inbox.');
                } else {
                    showError(d.message || 'Failed to resend.');
                }
            })
            .catch(function() {
                showError('Network error. Please try again.');
                if (btn) { btn.disabled = false; btn.textContent = 'Resend Verification Email'; }
            });
        }

        function createAlert(message, type) {
            var div = document.createElement('div');
            div.className = 'login-message ' + type;

            // Close button (×)
            var closeBtn = document.createElement('span');
            closeBtn.className = 'alert-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.title = 'Close';
            closeBtn.addEventListener('click', function() {
                dismissAlert(div);
            });

            // Text only — NO extra icon prefix
            var text = document.createElement('span');
            text.className = 'alert-text';
            text.textContent = message;

            div.appendChild(closeBtn);
            div.appendChild(text);

            if (messageArea) {
                messageArea.appendChild(div);
            } else {
                loginForm.parentNode.insertBefore(div, loginForm);
            }

            // Auto-dismiss after 5 seconds
            div._autoDismissTimer = setTimeout(function() {
                dismissAlert(div);
            }, 5000);
        }

        function dismissAlert(alertDiv) {
            if (!alertDiv) return;
            if (alertDiv._autoDismissTimer) {
                clearTimeout(alertDiv._autoDismissTimer);
            }
            alertDiv.style.animation = 'fadeOutUp 0.4s ease forwards';
            setTimeout(function() {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 400);
        }

        function clearMessages() {
            if (messageArea) {
                messageArea.innerHTML = '';
            }
            var msgs = document.querySelectorAll('.login-message');
            msgs.forEach(function(m) {
                if (m._autoDismissTimer) clearTimeout(m._autoDismissTimer);
                m.remove();
            });
        }

        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function escapeHtml(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ===== AUTO LOGIN VIA REMEMBER ME =====
        function tryAutoLogin() {
            var token = getCookie('remember_token');
            if (!token) {
                applyRememberedEmail();
                return;
            }

            var overlay = document.createElement('div');
            overlay.className = 'auto-login-overlay';
            overlay.innerHTML =
                '<div class="auto-login-box">' +
                    '<div class="auto-login-spinner"><div class="spinner-ring"></div></div>' +
                    '<div class="auto-login-text">Signing you in...</div>' +
                '</div>';
            document.body.appendChild(overlay);

            fetch('auto_login.php')
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success) {
                        overlay.innerHTML =
                            '<div class="auto-login-box" style="animation: boxPop 0.6s cubic-bezier(0.34,1.56,0.64,1)">' +
                                '<div class="auto-login-check">✓</div>' +
                                '<div class="auto-login-text" style="font-size:1.1rem;font-weight:600;margin-bottom:4px;">Welcome back' + (data.name ? ', ' + data.name.split(' ')[0] : '') + '!</div>' +
                                '<div class="auto-login-text" style="font-size:0.85rem;opacity:0.6;">Redirecting to your dashboard...</div>' +
                            '</div>';
                        setTimeout(function() {
                            ['bbAdminPage','bbBankPage','bbDrPage','bbMcPage','bbHospPage','bbDocPage','bbLabPage','bbDelPage'].forEach(k => localStorage.removeItem(k));
                            window.location.href = data.redirect;
                        }, 1200);
                    } else {
                        overlay.remove();
                        eraseCookie('remember_token');
                        eraseCookie('remember_email');
                        applyRememberedEmail();
                    }
                })
                .catch(function() {
                    overlay.remove();
                    applyRememberedEmail();
                });
        }

        function applyRememberedEmail() {
            try {
                var rememberedEmail = getCookie('remember_email');
                if (rememberedEmail && emailInput) {
                    emailInput.value = rememberedEmail;
                    if (rememberCheckbox) rememberCheckbox.checked = true;
                    showRememberedBanner(rememberedEmail);
                }
            } catch(e) {}
        }

        function showRememberedBanner(email) {
            var existing = document.querySelector('.remembered-banner');
            if (existing) existing.remove();
            var banner = document.createElement('div');
            banner.className = 'remembered-banner';
            banner.innerHTML =
                '<span class="remembered-icon">👋</span>' +
                '<span class="remembered-text">Welcome back, <strong>' + email + '</strong></span>' +
                '<span class="remembered-not">Not you? <button type="button" class="remembered-clear" id="clearRememberBtn">Clear</button></span>';
            var card = document.querySelector('.login-card');
            var msgArea = document.getElementById('messageArea');
            if (msgArea) {
                card.insertBefore(banner, msgArea.nextSibling);
            } else {
                var form = document.getElementById('loginForm');
                card.insertBefore(banner, form);
            }
            document.getElementById('clearRememberBtn').addEventListener('click', function() {
                banner.remove();
                eraseCookie('remember_token');
                eraseCookie('remember_email');
                if (emailInput) emailInput.value = '';
                if (rememberCheckbox) rememberCheckbox.checked = false;
                if (passwordInput) passwordInput.focus();
            });
        }

        function getCookie(name) {
            var value = '; ' + document.cookie;
            var parts = value.split('; ' + name + '=');
            if (parts.length === 2) {
                var raw = parts.pop().split(';').shift();
                try { return decodeURIComponent(raw); } catch(e) { return raw; }
            }
            return null;
        }

        function eraseCookie(name) {
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }

        // ===== URL PARAMETERS HANDLING =====
        var urlParams = new URLSearchParams(window.location.search);
        var urlError = urlParams.get('error');
        var urlSuccess = urlParams.get('success');

        if (urlError) {
            showError(decodeURIComponent(urlError));
            // Remove error from URL without refreshing
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (urlSuccess) {
            showSuccess(decodeURIComponent(urlSuccess));
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

})();