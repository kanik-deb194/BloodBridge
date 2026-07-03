/* ============================================================
   BloodBridge — signup.js (Updated)
   Supports: unified Donor & Recipient role + confirm password
   ============================================================ */

// ===============================
// AGE CALCULATION HELPER
// ===============================
function calcAge(dob) {
  if (!dob) return 0;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ===============================
// EMAIL VALIDATION (real-time)
// ===============================
function bindEmailValidation(inputId, statusId, errorId) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  const error = document.getElementById(errorId);
  if (!input || !status || !error) return;

  function validate() {
    const val = input.value.trim();
    if (!val) {
      status.className = 'field-status';
      status.textContent = '';
      error.className = 'field-error';
      error.textContent = '';
      return;
    }
    const atIndex = val.indexOf('@');
    if (atIndex < 1 || atIndex === val.length - 1) {
      status.className = 'field-status show invalid';
      status.textContent = '✗';
      error.className = 'field-error show';
      error.textContent = 'Please enter a complete email address (e.g. user@domain.com)';
      return;
    }
    const domain = val.slice(atIndex + 1).toLowerCase();
    if (!domain || domain.indexOf('.') < 1) {
      status.className = 'field-status show invalid';
      status.textContent = '✗';
      error.className = 'field-error show';
      error.textContent = 'Email domain is incomplete (e.g. @gmail.com)';
      return;
    }
    const commonDomains = ['gmail.com','yahoo.com','outlook.com','hotmail.com','live.com','icloud.com','protonmail.com','mail.com','aol.com','ymail.com','zoho.com','yandex.com','gmx.com','fastmail.com'];
    const isCommonDomain = commonDomains.includes(domain);
    if (!isCommonDomain) {
      if (domain.split('.').length < 2 || domain.length < 4) {
        status.className = 'field-status show invalid';
        status.textContent = '✗';
        error.className = 'field-error show';
        error.textContent = 'This email domain looks invalid.';
        return;
      }
    }
    status.className = 'field-status show valid';
    status.textContent = '✓';
    error.className = 'field-error';
    error.textContent = '';
  }

  input.addEventListener('input', validate);
  input.addEventListener('blur', validate);
}

bindEmailValidation('u_email', 'u_emailStatus', 'u_emailError');
bindEmailValidation('b_email', 'b_emailStatus', 'b_emailError');

// ===============================
// DOB AGE VALIDATION (donor_recipient)
// ===============================
(function() {
  const dobInput = document.getElementById('dr_dob');
  if (!dobInput) return;
  function validateDob() {
    const val = dobInput.value;
    const err = document.getElementById('dr_dobError');
    const status = document.getElementById('dr_dobStatus');
    if (!val) {
      if (err) { err.className = 'field-error'; err.textContent = ''; }
      if (status) { status.className = 'field-status'; status.textContent = ''; }
      return;
    }
    if (calcAge(val) < 17) {
      if (status) { status.className = 'field-status show invalid'; status.textContent = '✗'; }
      if (err) { err.className = 'field-error show'; err.textContent = 'You must be at least 17 years old.'; }
    } else {
      if (status) { status.className = 'field-status show valid'; status.textContent = '✓'; }
      if (err) { err.className = 'field-error'; err.textContent = ''; }
    }
  }
  dobInput.addEventListener('input', validateDob);
  dobInput.addEventListener('blur', validateDob);
})();

// ===============================
// THEME TOGGLE
// ===============================
const html = document.documentElement;
const stored = localStorage.getItem('bb-theme') || 'dark';
html.setAttribute('data-theme', stored);
document.getElementById('themeToggle').addEventListener('click', () => {
  const cur = html.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('bb-theme', next);
});

// ===============================
// ACCOUNT TYPE SWITCHER
// ===============================
const btnUser = document.getElementById('btnUser');
const btnBank = document.getElementById('btnBank');
const userForm = document.getElementById('userForm');
const bankForm = document.getElementById('bloodbankForm');

function switchType(type) {
  const accountTypeInput = document.getElementById('accountType');
  if (type === 'user') {
    btnUser.classList.add('active'); btnBank.classList.remove('active');
    userForm.style.display = 'block'; bankForm.style.display = 'none';
    userForm.classList.add('fade-in');
    if (accountTypeInput) accountTypeInput.value = 'user';
  } else {
    btnBank.classList.add('active'); btnUser.classList.remove('active');
    bankForm.style.display = 'block'; userForm.style.display = 'none';
    bankForm.classList.add('fade-in');
    if (accountTypeInput) accountTypeInput.value = 'bloodbank';
  }
}
btnUser.addEventListener('click', (e) => { e.preventDefault(); switchType('user'); });
btnBank.addEventListener('click', (e) => { e.preventDefault(); switchType('bloodbank'); });

// ===============================
// ROLE SELECTOR
// ===============================
const roleSelect = document.getElementById('u_role');
const allRoleFields = document.querySelectorAll('.role-fields');
if (roleSelect) {
  roleSelect.addEventListener('change', function () {
    allRoleFields.forEach(f => { f.style.display = 'none'; f.classList.remove('slide-in'); });
    const val = this.value;
    if (val) {
      const target = document.getElementById('fields_' + val);
      if (target) { target.style.display = 'block'; requestAnimationFrame(() => target.classList.add('slide-in')); }
    }
  });
}

// ===============================
// PASSWORD TOGGLE
// ===============================
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', function () {
    const input = document.getElementById(this.dataset.target);
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    const eyeOpen = this.querySelector('.eye-open');
    const eyeClosed = this.querySelector('.eye-closed');
    if (eyeOpen) eyeOpen.style.display = isHidden ? '' : 'none';
    if (eyeClosed) eyeClosed.style.display = isHidden ? 'none' : '';
  });
});

// ===============================
// PASSWORD STRENGTH
// ===============================
function checkStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
function bindStrength(inputId, fillId, labelId) {
  const input = document.getElementById(inputId);
  const fill  = document.getElementById(fillId);
  const label = document.getElementById(labelId);
  if (!input) return;
  input.addEventListener('input', function () {
    const v = this.value;
    if (!v) { fill.style.width = '0'; label.textContent = ''; return; }
    const s = checkStrength(v);
    const map = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#f87171', '#fbbf24', '#60a5fa', '#4ade80'];
    const widths = ['0%', '25%', '50%', '75%', '100%'];
    fill.style.width = widths[s]; fill.style.background = colors[s];
    label.textContent = map[s]; label.style.color = colors[s];
  });
}
bindStrength('u_password', 'pwFill', 'pwLabel');
bindStrength('b_password', 'bpwFill', 'bpwLabel');

// ===============================
// CONFIRM PASSWORD VALIDATION
// ===============================
function bindConfirmCheck(pwId, confirmId, errorId) {
  const pw = document.getElementById(pwId);
  const cf = document.getElementById(confirmId);
  const err = document.getElementById(errorId);
  if (!pw || !cf || !err) return;
  function validate() {
    if (cf.value && cf.value !== pw.value) {
      err.textContent = '⚠️ Passwords do not match.';
      cf.closest('.input-wrap').style.borderColor = '#f87171';
      return false;
    } else {
      err.textContent = '';
      cf.closest('.input-wrap').style.borderColor = '';
      return true;
    }
  }
  cf.addEventListener('input', validate);
  pw.addEventListener('input', () => { if (cf.value) validate(); });
}
bindConfirmCheck('u_password', 'u_confirm_password', 'u_pwMatchError');
bindConfirmCheck('b_password', 'b_confirm_password', 'b_pwMatchError');

// ===============================
// TERMS CHECKBOX — DISABLE BUTTON UNTIL AGREED
// ===============================
(function() {
  const agreeCheck = document.getElementById('agreeTerms');
  const submitBtn = document.getElementById('submitBtn');
  if (agreeCheck && submitBtn) {
    submitBtn.disabled = true;
    agreeCheck.addEventListener('change', function() {
      submitBtn.disabled = !this.checked;
      const hint = document.getElementById('checkHint');
      if (hint) hint.style.display = 'none';
    });
  }
})();

// ===============================
// EMAIL EXISTS OVERLAY
// ===============================
function showEmailExistsOverlay(msg) {
  const existing = document.getElementById('emailExistsOverlay');
  if (existing) existing.remove();

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const cardBg = isLight ? 'rgba(250,247,248,0.97)' : 'rgba(14,10,11,0.95)';
  const cardBorder = isLight ? 'rgba(192,22,44,0.12)' : 'rgba(192,22,44,0.2)';
  const textColor = isLight ? 'rgba(30,10,15,0.6)' : 'rgba(245,240,238,0.6)';
  const mutedColor = isLight ? 'rgba(30,10,15,0.35)' : 'rgba(245,240,238,0.35)';
  const overlay = document.createElement('div');
  overlay.id = 'emailExistsOverlay';
  overlay.innerHTML = `
    <div style="
      position:fixed;inset:0;z-index:99999;
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);
      animation:fadeIn 0.35s ease both;
    ">
      <div style="
        max-width:420px;width:90%;padding:40px 32px;border-radius:20px;
        background:${cardBg};border:1px solid ${cardBorder};
        text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.5);
        animation:scaleIn 0.35s ease both;
      ">
        <div style="
          width:64px;height:64px;border-radius:50%;
          background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.2);
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 16px;font-size:28px;
        ">ℹ️</div>
        <h3 style="margin:0 0 8px;font-size:1.15rem;font-weight:700;color:#facc15;">
          Account Already Exists
        </h3>
        <p style="margin:0 0 18px;font-size:0.88rem;color:${textColor};line-height:1.6;">
          ${msg}
        </p>
        <p style="margin:0 0 6px;font-size:0.78rem;color:${mutedColor};">
          Redirecting you to login<span id="eeDots">.</span>
        </p>
      </div>
    </div>
    <style>
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes scaleIn{from{opacity:0;transform:scale(0.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
    </style>
  `;
  document.body.appendChild(overlay);

  // Animate dots
  let dots = 0;
  setInterval(() => {
    dots = (dots % 3) + 1;
    const el = document.getElementById('eeDots');
    if (el) el.textContent = '.'.repeat(dots);
  }, 400);
}

// ===============================
// FORM SUBMIT
// ===============================
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const agree = document.getElementById('agreeTerms');
  const errorMsg = document.getElementById('errorMsg');
  const successMsg = document.getElementById('successMsg');
  const btn = document.getElementById('submitBtn');
  const txt = btn.querySelector('.btn-submit-text');
  const ico = btn.querySelector('.btn-submit-icon');
  const ldr = btn.querySelector('.btn-loader');

  errorMsg.style.display = 'none';
  successMsg.style.display = 'none';

  // TERMS CHECK
  if (!agree.checked) {
    const label = agree.closest('.checkbox-label');
    label.classList.add('shake');
    const hint = document.getElementById('checkHint');
    if (hint) hint.style.display = 'block';
    setTimeout(() => label.classList.remove('shake'), 500);
    return;
  }

  // AGE CHECK (donor_recipient only)
  const role = document.querySelector('[name="role"]:checked')?.value;
  if (role === 'donor_recipient') {
    const dob = document.getElementById('dr_dob')?.value;
    if (!dob) {
      errorMsg.textContent = 'Please enter your date of birth.';
      errorMsg.style.display = 'block';
      document.getElementById('dr_dob')?.focus();
      return;
    }
    if (calcAge(dob) < 17) {
      errorMsg.textContent = 'You must be at least 17 years old to register.';
      errorMsg.style.display = 'block';
      document.getElementById('dr_dob')?.focus();
      return;
    }
  }

  // CONFIRM PASSWORD CHECK (active form only)
  const accountType = document.getElementById('accountType').value;
  if (accountType === 'user') {
    const pw = document.getElementById('u_password').value;
    const cpw = document.getElementById('u_confirm_password').value;
    if (pw !== cpw) {
      errorMsg.textContent = 'Password and confirm password do not match.';
      errorMsg.style.display = 'block';
      document.getElementById('u_confirm_password').focus();
      return;
    }
  } else {
    const pw = document.getElementById('b_password').value;
    const cpw = document.getElementById('b_confirm_password').value;
    if (pw !== cpw) {
      errorMsg.textContent = 'Password and confirm password do not match.';
      errorMsg.style.display = 'block';
      document.getElementById('b_confirm_password').focus();
      return;
    }
  }

  // BUTTON LOADING
  btn.disabled = true;
  txt.textContent = 'Creating...';
  ico.style.display = 'none';
  ldr.style.display = 'inline-flex';

  try {
    const formData = new FormData(this);
    const accountTypeInput = document.getElementById('accountType');
    if (accountTypeInput) formData.set('account_type', accountTypeInput.value);

    const response = await fetch('signup.php', { method: 'POST', body: formData });
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch (jsonError) {
      console.error('PHP RESPONSE:', text);
      throw new Error('Invalid response from server.');
    }
    if (result.success) {
      successMsg.style.display = 'flex';
      setTimeout(() => { window.location.href = result.redirect || 'login.html'; }, 1800);
      return;
    }

    if (result.email_exists) {
      showEmailExistsOverlay(result.message);
      setTimeout(() => { window.location.href = result.redirect || 'login.html'; }, 3000);
      btn.disabled = false;
      txt.textContent = 'Create Account';
      ico.style.display = '';
      ldr.style.display = 'none';
      return;
    }

    throw new Error(result.message || 'Signup failed.');
  } catch (error) {
    console.error(error);
    errorMsg.textContent = error.message;
    errorMsg.style.display = 'block';
    btn.disabled = false;
    txt.textContent = 'Create Account';
    ico.style.display = '';
    ldr.style.display = 'none';
  }
});

// ===============================
// INPUT FOCUS EFFECT
// ===============================
document.querySelectorAll('.field-input, .field-select, .field-textarea').forEach(el => {
  el.addEventListener('focus', () => el.closest('.input-wrap')?.classList.add('focused'));
  el.addEventListener('blur', () => el.closest('.input-wrap')?.classList.remove('focused'));
});