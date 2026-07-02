(function () {
  'use strict';

  /* ========================================================
     STATE — always guest mode, no auth involvement
  ======================================================== */
  var state = {
    isOpen: false,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    bubbleX: null,
    bubbleY: null,
    originX: null,
    originY: null,
    firstOpen: true,
    wasDragged: false,
    faqOpen: false,
  };

  var GUEST_STORAGE_KEY = 'rak_guest_chat';

  var AUTH_MODE = window._RAK_CONFIG && window._RAK_CONFIG.auth === true;
  var AUTH_API = window._RAK_CONFIG && window._RAK_CONFIG.api || 'chat_api.php';
  var AUTH_USER_ID = window._RAK_CONFIG && window._RAK_CONFIG.userId || null;
  var authSessionId = AUTH_USER_ID ? 'CHAT-' + AUTH_USER_ID : null;
  var authHistoryLoaded = false;

  /* ========================================================
     FAQ DATA — Categorized Questions & Answers
  ======================================================== */
  var FAQ_DATA = [
    {
      category: 'Blood Donation Eligibility',
      icon: '✅',
      items: [
        { q: 'Who can donate blood?', a: 'Anyone aged **18–65 years** weighing at least **50kg**, in good general health. You need a valid ID, pass a quick health screening, and have haemoglobin ≥ 12.5 g/dL. Certain medical conditions, recent surgeries, or medications may temporarily defer you — our AI can check your specific situation.' },
        { q: 'Can I donate if I have high blood pressure?', a: 'Yes, if your BP is **controlled** (below 180/100) and you feel well on donation day. Uncontrolled hypertension or recent medication changes may require deferral. Always inform the screening staff about your condition.' },
        { q: 'Can I donate if I have diabetes?', a: 'Yes, **well-controlled** diabetes (type 1 or type 2) does not prevent donation. However, if you use insulin or certain medications, check with our team. Avoid donating if your sugar is very high or low on that day.' },
        { q: 'Can I donate during pregnancy or breastfeeding?', a: '**No** during pregnancy. After delivery, wait at least **6 months** (or 3 months after weaning if breastfeeding). Your body needs time to replenish iron stores before donation.' },
        { q: 'Can I donate if I have a tattoo or piercing?', a: 'In Bangladesh, you need to wait **6 months** after getting a tattoo or piercing from a licensed professional. If done with sterile equipment at a registered studio, some blood banks may accept after 3 months.' },
        { q: 'What medications prevent blood donation?', a: 'Blood thinners (like aspirin, warfarin), isotretinoin (Accutane), finasteride, and some antibiotics may require temporary deferral. **Common medications like paracetamol, antihistamines, and most antidepressants are usually fine** — always disclose everything during screening.' },
        { q: 'What is the minimum haemoglobin level for donation?', a: 'At least **12.5 g/dL** for both men and women. A finger-prick test is done on-site before donation. Low haemoglobin (anaemia) is one of the most common reasons for temporary deferral — eating iron-rich foods can help improve your levels.' },
        { q: 'Can I donate if I have asthma?', a: '**Yes**, if your asthma is well-controlled and you are not having an active attack. If you use inhalers, that is generally fine. Avoid donating if you are experiencing wheezing, shortness of breath, or have been on oral steroids recently.' },
        { q: 'Can I donate if I have thyroid problems?', a: '**Yes**, if your thyroid condition is controlled with medication and you feel well. Both hyperthyroidism and hypothyroidism are acceptable once stable. Wait until your medication dosage has been steady for at least 3 months.' },
        { q: 'Can I donate if I have thalassemia trait?', a: 'It depends on your haemoglobin level. If you have **thalassemia minor (trait)** and your haemoglobin is above **12.5 g/dL**, you may be accepted. **Thalassemia major** donors are not accepted. Check with the screening doctor at the blood bank.' },
        { q: 'Can I donate if I have allergies or hay fever?', a: '**Yes**, if your symptoms are mild and you are not taking medications that cause drowsiness. Seasonal allergies, hay fever, and mild food allergies do not prevent donation. Avoid donating during a severe allergic reaction.' },
        { q: 'Can I donate if I had surgery recently?', a: 'It depends on the surgery. **Minor surgery** (tooth extraction, minor skin procedures) — wait 1 week. **Major surgery** — wait **6 months** (or until fully recovered and cleared by your doctor). Always inform the screening team.' },
        { q: 'Can I donate blood while on my period?', a: '**Yes**, you can donate during menstruation if you feel well and are not experiencing severe cramps or heavy blood loss. Your body may have slightly lower iron stores, but most women can donate safely. Drink extra water and eat iron-rich foods.' },
        { q: 'Can I donate if I had jaundice before?', a: 'If you had **jaundice due to hepatitis B or C** — **permanent deferral**. If it was due to other causes (newborn jaundice, gallstones, G6PD deficiency) and you are fully recovered — you may be accepted after **6 months** symptom-free.' },
        { q: 'Can I donate blood if I have a heart condition?', a: '**Most heart conditions require deferral.** If you have had a heart attack, bypass surgery, angioplasty, or valve replacement — **permanent deferral**. Mild, controlled conditions may be evaluated case-by-case. Always consult your cardiologist first.' },
        { q: 'Can I donate if I have epilepsy or seizures?', a: '**Yes**, if you have been seizure-free for at least **6 months** without medication, or **12 months** with medication. If you had a recent seizure or your medication was changed recently, wait until stable.' },
        { q: 'Can I donate if I have cancer?', a: '**Generally no.** Most cancers require **permanent deferral** due to the risk of transmitting disease and the effects of treatment. However, some minor skin cancers (basal cell carcinoma, squamous cell carcinoma) may be accepted after full treatment and healing.' },
        { q: 'Can I donate if I have kidney disease?', a: '**Chronic kidney disease** — generally **permanent deferral**. If you have had a single kidney stone with no other issues, you may be accepted once fully recovered. Always check with the blood bank doctor.' },
        { q: 'Can I donate blood if I am vegetarian or vegan?', a: '**Yes**, vegetarians and vegans can donate blood. However, you may have **lower iron stores** since plant-based iron is less easily absorbed. Eat iron-rich plant foods (spinach, lentils, beans, fortified cereals) with vitamin C (lemon, orange) in the days before donation. Consider getting your ferritin levels checked.' },
        { q: 'Can I donate if I have G6PD deficiency?', a: 'It depends on the severity. **Mild G6PD deficiency** with no active symptoms and normal haemoglobin levels — you **may be accepted**. **Severe G6PD deficiency** or history of haemolytic crises — **permanent deferral**. Always inform the screening doctor about your condition.' },
        { q: 'Can I donate if I smoke or use tobacco?', a: '**Yes**, smoking does not prevent blood donation. However, avoid smoking for **2 hours before and 2 hours after** donation — it can affect blood pressure and oxygen levels. Heavy smoking may lead to lower haemoglobin levels over time.' },
        { q: 'Can I donate blood if I have a fever?', a: '**No.** Wait until you have been **fever-free for at least 7 days** without medication. A fever may indicate an underlying infection that could affect blood safety or your own well-being during donation.' },
        { q: 'Can I donate if I have psoriasis or eczema?', a: '**Yes**, mild to moderate psoriasis and eczema do not prevent blood donation. Avoid donating if there is an active **infected skin lesion** at the needle site. If you are taking **systemic immunosuppressants** (methotrexate, cyclosporine, biologics), check with the blood bank — some medications require deferral.' },
        { q: 'Can I donate blood after scuba diving?', a: '**Yes**, but wait **48 hours** after a single no-decompression dive, and **7 days** after decompression diving or if you had decompression sickness. Rapid pressure changes can release nitrogen bubbles into the blood, making you temporarily ineligible.' },
        { q: 'Can I donate if I have had a blood clot or DVT?', a: '**It depends.** If you had a **deep vein thrombosis (DVT)** or pulmonary embolism, wait **6 months** after completing treatment. If you are on **blood thinners** (warfarin, rivaroxaban, apixaban), you are **deferred** while on medication. Once off blood thinners and cleared by your doctor, you may donate.' },
      ],
    },
    {
      category: 'Donation Process & Preparation',
      icon: '📋',
      items: [
        { q: 'How long does blood donation take?', a: 'The entire process takes about **15–20 minutes** from registration to refreshments. The actual blood draw is only **5–10 minutes**. Plan to stay for 10-15 minutes afterward to rest and hydrate.' },
        { q: 'How should I prepare before donating blood?', a: '**Before:** Eat a balanced meal 2-3 hours prior. Drink extra water (500ml extra). Avoid fatty/fried foods 24 hours before. Get good sleep. Wear comfortable clothing with sleeves that roll up. Bring a valid ID.' },
        { q: 'What should I eat before donating blood?', a: 'Iron-rich foods are best: **spinach, lentils, beans, red meat, fortified cereals, dates, and beetroot**. Pair with vitamin C (orange juice, lemon water) to boost iron absorption. Avoid fatty meals — they can affect the blood screening tests.' },
        { q: 'How much blood is taken during donation?', a: 'A standard donation is **350ml–450ml** (about one pint), which is roughly 8-10% of your total blood volume. Your body replenishes plasma within 24-48 hours and red blood cells within 4-6 weeks.' },
        { q: 'Can I donate if I have a cold or flu?', a: '**No.** Wait until you have fully recovered (symptom-free for at least 7 days). If you are taking antibiotics, wait until the course is complete and you feel well. Donating while sick stresses your immune system.' },
        { q: 'Can I exercise before or after donating?', a: '**Avoid** heavy exercise or intense workouts 24 hours before donation. After donation, avoid strenuous activity for the rest of the day. Light walking is fine. Listen to your body — if you feel dizzy, rest.' },
        { q: 'Where can I donate blood in Bangladesh?', a: 'Blood can be donated at: **government hospital blood banks** (DMCH, BSMMU, Dhaka Medical), **private hospital banks** (Square, Apollo, United, LabAid), and **standalone blood banks** (Sandhani, Badhon, Quantum). Raktosathi/BloodBridge lists verified donation centres near you!' },
        { q: 'What should I wear for blood donation?', a: 'Wear comfortable, loose-fitting clothing with **sleeves that can be easily rolled up** above the elbow. Short sleeves or loose t-shirts are best. Avoid tight or restrictive clothing. Stay comfortable — you will be sitting for 15-20 minutes.' },
        { q: 'I\'m scared of needles, what should I do?', a: 'You are not alone — many donors feel nervous! **Tips:** Look away during the needle insertion, take deep breaths, talk to the staff, bring a friend for support, and remember the pinch lasts only **2-3 seconds**. Over 90% of first-time donors say it was much easier than expected!' },
        { q: 'What ID do I need to bring?', a: 'Bring a **valid government-issued photo ID**: NID (National ID), passport, driving license, or birth certificate. A student ID card may be accepted at some centres. The ID is used for registration and verification purposes.' },
        { q: 'What does the health screening involve?', a: 'The screening includes: a short questionnaire about your health and travel history, **blood pressure check**, **pulse rate**, **temperature**, and a **finger-prick test** to check haemoglobin level. It takes about 5 minutes and is completely painless except for the finger prick.' },
        { q: 'Can I eat before donating blood?', a: '**Yes, absolutely!** Never donate on an empty stomach. Eat a **balanced meal** 2-3 hours before donation. Include iron-rich foods and carbohydrates. Avoid fatty, oily, or deep-fried foods for at least 24 hours before — they can affect blood screening tests.' },
        { q: 'What should I avoid before donating blood?', a: '**Avoid:** fatty/fried foods (24 hours before), alcohol (24 hours before), smoking (2 hours before), heavy exercise (24 hours before), and donating on an empty stomach. **Do:** stay hydrated, eat well, and get good sleep.' },
        { q: 'Any tips for first-time donors?', a: '**Congratulations on deciding to save lives! 🎉** Drink extra water, eat a good meal, wear comfortable clothing, bring a friend, inform the staff it is your first time (they will guide you), relax during the draw, and enjoy the refreshments afterward. You will feel proud!' },
        { q: 'Can I listen to music or watch videos while donating?', a: '**Absolutely!** Many blood centres have TVs or allow you to use your phone/headphones. Listening to music, watching a show, or chatting with staff can help you relax and make the **5-10 minutes** of the draw go by quickly. Some donors even meditate or do deep breathing.' },
        { q: 'Can I bring a friend or family member while donating?', a: '**Yes**, having a companion is encouraged — especially for first-time donors. They can keep you company, help you relax, and drive you home if you feel dizzy. Most blood banks have a waiting area for companions. Children are usually not allowed in the donation area for safety.' },
        { q: 'Can I donate blood if I have a cough but no fever?', a: '**It depends on the cause.** A mild allergic cough or throat clearing is fine. However, if you have a **productive cough, chest congestion, or signs of a respiratory infection**, it is better to wait until you are fully recovered (symptom-free for at least 7 days).' },
      ],
    },
    {
      category: 'After Donation Care',
      icon: '🩹',
      items: [
        { q: 'What should I do after donating blood?', a: '**Rest for 10-15 minutes** at the centre. Drink plenty of fluids (water, juice, ORS). Eat a good meal within 2 hours. Avoid alcohol for 24 hours. Keep the bandage on for 4-6 hours. Avoid smoking for 2 hours. No strenuous exercise for the rest of the day.' },
        { q: 'What are the common side effects of blood donation?', a: 'Most donors feel **perfectly fine**. Some may experience: mild dizziness, light-headedness, slight bruising at the needle site, or tiredness. These resolve within a few hours. **Serious side effects are extremely rare** — about 1 in 10,000 donations.' },
        { q: 'How long does it take to recover after donating?', a: 'Your body replaces **plasma** within **24-48 hours** and **red blood cells** within **4-6 weeks**. Most people feel back to normal the same day. Drinking extra fluids and eating iron-rich foods speeds up recovery.' },
        { q: 'What should I do if I feel dizzy after donation?', a: 'If you feel dizzy, **lie down immediately with feet elevated** above heart level. Inform the staff. Drink water or juice. Do NOT drive until you feel completely normal. Dizziness usually passes within 10-15 minutes.' },
        { q: 'How often can I donate blood?', a: 'In Bangladesh, you can donate **whole blood every 56 days (8 weeks)**. That means you can donate up to **6 times per year** for men and up to **4 times per year** for women (due to lower iron stores). Platelet donation can be done every 7 days, up to 24 times per year.' },
        { q: 'When can I shower after donating blood?', a: 'You can shower **anytime**, but keep the **bandage/plaster dry for 4-6 hours**. If you must shower earlier, cover it with a waterproof bandage. Avoid hot baths or saunas for the rest of the day.' },
        { q: 'When can I drive after donating blood?', a: 'Wait at least **30 minutes** after donation before driving. If you feel dizzy, lightheaded, or weak — **do not drive**. Have someone accompany you or wait until you feel completely normal. Better to be safe.' },
        { q: 'Can I travel after donating blood?', a: '**Short-distance travel** (1-2 hours) is fine the same day. For **long-distance travel** (flights, long bus journeys), wait at least **24 hours**. Stay hydrated during travel. If you feel unwell, rest before continuing.' },
        { q: 'Can I drink alcohol after donating blood?', a: '**Avoid alcohol for 24 hours** after donation. Alcohol can dehydrate you, worsen dizziness, and slow your recovery. Your body needs fluids to replenish blood volume — alcohol works against this. Wait until the next day.' },
        { q: 'Should I take iron supplements after donating?', a: 'If you donate regularly, consider taking an **iron supplement** (ferrous sulfate 200mg daily for 8 weeks) or eating iron-rich foods regularly. Most occasional donors replenish iron through diet alone. Consult your doctor before taking supplements.' },
        { q: 'Can I go back to work after donating?', a: '**Yes**, most people return to work the same day. If your job involves heavy lifting, prolonged standing, or strenuous activity, consider taking it easy for the rest of the day. Office and desk jobs are perfectly fine.' },
        { q: 'What should I do if the bleeding doesn\'t stop?', a: 'Apply **firm pressure** to the site with a clean cloth for 5-10 minutes without checking. Keep your arm elevated above heart level. If bleeding continues after 15 minutes of continuous pressure, seek medical attention. This is very rare.' },
        { q: 'How should I treat a bruise after blood donation?', a: 'A bruise at the needle site is **common and harmless**. To treat: apply a **cold compress** (ice wrapped in cloth) for 10-15 minutes several times a day for the first 24 hours, then switch to **warm compresses** to help reabsorb the blood. The bruise will fade over **5-7 days**. Avoid taking blood thinners like aspirin.' },
        { q: 'Can I use a hot tub, sauna, or steam bath after donating?', a: '**Avoid for 24 hours.** Heat causes blood vessels to dilate, which can worsen dizziness and increase the risk of fainting. Hot water can also soften the scab at the needle site. Stick to warm (not hot) showers for the first day.' },
        { q: 'Why do I need to keep the bandage on for 4-6 hours?', a: 'The bandage protects the **needle puncture site** from bacteria and friction. Removing it too early can restart bleeding or cause infection. After 4-6 hours, the site should be sufficiently closed. If you notice redness, swelling, or warmth around the site, contact your doctor.' },
      ],
    },
    {
      category: 'Blood Groups & Compatibility',
      icon: '🅰️',
      items: [
        { q: 'What are the different blood types?', a: 'There are **8 major blood types**: A+, A-, B+, B-, O+, O-, AB+, AB-. They are determined by the presence or absence of A and B antigens plus the Rh factor (positive/negative). O+ is the most common (36% of people), AB- is the rarest (1%).' },
        { q: 'What is the universal donor blood type?', a: '**O-negative (O−)** is the universal donor — it can be given to patients of any blood type. This makes O− critically important for emergencies when there is no time to test blood type. Only about 7% of people have O− blood.' },
        { q: 'What is the universal recipient blood type?', a: '**AB-positive (AB+)** is the universal recipient — they can receive blood from any type. However, AB+ plasma is universal donor plasma! Only about 3% of the population has AB+ blood.' },
        { q: 'Is blood type inherited from parents?', a: 'Yes, your blood type is determined by **genetics from both parents**. Each parent contributes one allele (A, B, or O). The Rh factor (positive/negative) is also inherited. You can use a Punnett square to predict possible blood types of children.' },
        { q: 'Which blood groups are rarest in Bangladesh?', a: 'In Bangladesh, the distribution is roughly: **O+ (32%), B+ (30%), A+ (22%), AB+ (8%), O- (3%), B- (2.5%), A- (1.5%), AB- (1%)**. So AB- and A- are the rarest and most needed from regular donors.' },
        { q: 'Can blood type change over time?', a: '**No**, your blood type is genetically determined and remains the same throughout your life. The only exceptions are after a bone marrow transplant or in very rare medical conditions. It is a good idea to verify your blood type once in a certified lab.' },
        { q: 'What is the Bombay blood group (hh)?', a: '**Bombay blood group (Oh)** is extremely rare — first discovered in Mumbai (Bombay), India. These individuals can **only receive blood from other Bombay donors**. Found in about **1 in 10,000** people in India and Bangladesh. BloodBridge helps locate Bombay donors in emergencies.' },
        { q: 'How is blood type determined genetically?', a: 'Your blood type comes from **one allele from each parent**. The A and B alleles are dominant over O. A + A or A + O = Type A. B + B or B + O = Type B. A + B = Type AB. O + O = Type O. The Rh+ allele is dominant over Rh-.' },
        { q: 'Which blood type is needed most in hospitals?', a: '**Type O+** is the most requested because it is the most common (36% of population) and can be given to any Rh+ patient. **O-** is critically needed for emergencies. **AB-** and **A-** are in highest demand relative to their low donor numbers.' },
        { q: 'Can blood type affect pregnancy?', a: '**Yes**, if an Rh-negative mother carries an Rh-positive baby, her immune system may develop antibodies that can harm future pregnancies. This is **Rh incompatibility** — it is prevented with **RhoGAM** (Anti-D immunoglobulin) injections during pregnancy.' },
        { q: 'What is the Rh factor?', a: 'The **Rh factor** is a protein on red blood cells. If you have it, you are **Rh-positive (Rh+)**. If not, **Rh-negative (Rh-)**. About **85%** of people are Rh+. The Rh factor is important for blood transfusions and pregnancy management.' },
        { q: 'Can twins have different blood types?', a: '**Yes**, fraternal (dizygotic) twins can have different blood types because they come from two separate eggs fertilized by different sperm. **Identical twins** always have the same blood type. Even fraternal twins can share the same type by chance.' },
        { q: 'Do blood types have any health implications?', a: 'Some studies suggest: Type O people have **lower risk** of heart disease and blood clots but **higher risk** of stomach ulcers. Type A may have higher risk of stomach cancer. Type AB may have higher risk of cognitive decline. These are statistical associations, not certainties.' },
      ],
    },
    {
      category: 'Raktosathi Platform',
      icon: '🏥',
      items: [
        { q: 'How does Raktosathi / BloodBridge work?', a: 'Raktosathi connects **donors, recipients, blood banks, and hospitals** in real time. Donors register with their blood type and location. Hospitals post requests. The system matches compatible donors nearby and alerts them via SMS, app, and email. It is a complete blood supply chain platform.' },
        { q: 'How do I register on Raktosathi?', a: 'Click the **Login** button → "New User? Sign Up". Fill in your name, email, phone, password, blood type, and location. After verification (email/SMS OTP), you can start donating or requesting blood. It takes about 2 minutes!' },
        { q: 'How do I find blood near me?', a: 'Go to **Find Blood** on the website. Enter your location or allow GPS access. Select the blood group and units needed. The system instantly shows compatible donors and available stock at nearby blood banks. You can filter by distance and urgency.' },
        { q: 'Can I request blood in an emergency?', a: 'Yes! Click the **🚨 Emergency Request** button on the homepage or in the app. Fill in blood type, location, urgency, and contact info. The system broadcasts your request to all verified donors within a 10km radius immediately. Emergency response time averages under 30 minutes.' },
        { q: 'Is Raktosathi free to use?', a: '**Yes, completely free** for donors and recipients. Blood banks and hospitals may have premium features for advanced inventory management, analytics, and API integration. We believe access to life-saving blood should never have a price barrier.' },
        { q: 'What dashboards does BloodBridge offer?', a: 'BloodBridge provides **role-specific dashboards**: Donor/Recipient Dashboard, Hospital Dashboard, Blood Bank Dashboard, Delivery Staff Dashboard, Lab Technician Dashboard, Doctor Dashboard, Medical College Dashboard, and Admin Dashboard — each with tools tailored to their role.' },
        { q: 'How does donor matching work?', a: 'When a request is placed, BloodBridge matches based on: **blood type compatibility**, **distance from the patient**, **donor availability status**, **donation history** (within eligible interval), and **response rate**. Compatible donors within 10km are notified first, then expanded if needed.' },
        { q: 'Can I contact a donor directly?', a: 'Donor contact details are revealed **only after a donor accepts a request**. Both parties can then communicate through the platform\'s in-app messaging or phone (if the donor consents). Your contact is never shared without your permission.' },
        { q: 'How do I search for donors by location?', a: 'Use the **Find Blood** feature. Enter your location or turn on GPS. Select the blood group and units needed. The map view shows nearby donors and blood banks. You can filter by radius (5km, 10km, 20km, 50km) and sort by distance or rating.' },
        { q: 'What is the blood stock tracking feature?', a: 'Blood banks using BloodBridge can **update their real-time inventory** of blood units by type. Hospitals can view available stock across multiple banks before requesting. This reduces wastage and speeds up matching. The system sends alerts when stock for any blood type runs low.' },
        { q: 'How do I cancel a request?', a: 'Go to your **dashboard** → **My Requests**. Find the active request and click **Cancel Request**. You can cancel at any time before a donor has started traveling. If a donor is already en route, please call them directly to inform them.' },
        { q: 'Can I see my donation history?', a: '**Yes!** Your **Donor Dashboard** shows your complete donation history: dates, locations, blood type donated, units, and any rewards earned. Hospitals and blood banks can also see their transfusion and processing history.' },
        { q: 'Can I register as both donor and hospital staff?', a: '**Yes**, you can have multiple roles under one account. During registration, select all roles that apply. You can switch between dashboards from the profile menu. Each role has its own dashboard and permissions.' },
        { q: 'How do I become a BloodBridge delivery partner?', a: 'To become a delivery partner: Register on BloodBridge → select **Delivery Staff** as your role → provide your vehicle details (bike/car) and service area → complete the **online training module** (cold chain handling, blood safety, emergency procedures) → get verified. Delivery partners earn **per-delivery fees** plus bonuses for emergency response.' },
        { q: 'How can my blood bank or hospital partner with BloodBridge?', a: 'Contact our partnerships team at **partners@bloodbridge.com** or call **08000-123-456**. We provide: free dashboard integration, real-time inventory management, donor matching, SMS alerts, and analytics. Blood banks get **reduced wastage** through our redistribution network. Onboarding takes 2-5 business days.' },
        { q: 'Does BloodBridge offer API integration for hospitals?', a: '**Yes!** BloodBridge provides **REST API** integration for hospitals and blood banks with existing systems. The API supports: donor search, request placement, inventory queries, status tracking, and notification triggers. Full **API documentation** is available at **api.bloodbridge.com/docs** for registered institutions.' },
      ],
    },
    {
      category: 'Emergency & Urgent Requests',
      icon: '🚨',
      items: [
        { q: 'How do I place an emergency blood request?', a: 'Click the **Emergency Request** button (red pulsing button on the homepage). Provide: patient name, blood group, units needed, hospital/location, doctor\'s contact, and urgency level. The system instantly alerts all compatible donors within the area via SMS and in-app notification.' },
        { q: 'How fast is the emergency response?', a: 'Our system targets a response within **30 minutes** for emergency requests in urban areas (Dhaka, Chittagong) and within **60 minutes** for semi-urban areas. Response times depend on donor availability, traffic, and distance from the nearest verified donor.' },
        { q: 'What should I do if no donor responds to my request?', a: 'Don\'t panic. The system will **escalate** your request to a wider radius (20km, then 50km) and notify partner blood banks. You can also **call our emergency helpline** at **08000-123-456** for manual coordination. Hospital blood banks can also cross-match from existing stock.' },
        { q: 'Can I track emergency request status?', a: 'Yes! After placing a request, you get a **live tracking dashboard** showing: number of donors contacted, how many have responded, estimated arrival time, and donor details once confirmed. You receive SMS updates at every stage.' },
        { q: 'What if the needed blood type is rare?', a: 'For rare blood types (AB-, A-, Bombay, etc.), the system **expands the search radius** immediately and notifies rare donor registries. BloodBridge maintains a **special rare donor database**. Partner blood banks are also alerted to check their inventory for rare units.' },
        { q: 'Can I request blood for someone else?', a: '**Yes**, you can place a request on behalf of a family member, friend, or any patient in need. Provide accurate patient and hospital information. The donor will be informed that it is a third-party request. Ensure you have consent from the patient or hospital.' },
        { q: 'Is the emergency service available 24/7?', a: '**Yes**, BloodBridge\'s emergency request system runs **24 hours a day, 7 days a week**. Our emergency helpline is also staffed around the clock at **08000-123-456**. Donors receive notifications at any time — they can choose to respond based on their availability.' },
        { q: 'What information is needed for an emergency request?', a: 'You will need: **patient\'s full name**, **blood group** (if known), **units needed**, **hospital name and location**, **doctor\'s contact number**, **urgency level** (critical/urgent/standard), and **your contact information**. The more accurate the information, the faster the response.' },
      ],
    },
    {
      category: 'Health & Safety',
      icon: '❤️',
      items: [
        { q: 'Is blood donation safe?', a: '**Yes, extremely safe.** All equipment is sterile, single-use, and disposed of after each donation. You cannot get any infection or disease from donating blood. The screening process ensures you are healthy enough to donate. Serious complications occur in less than 0.01% of donations.' },
        { q: 'Can I get HIV or other infections from donating?', a: '**Absolutely not.** New, sterile, single-use needles and blood bags are used for every donation. There is zero risk of contracting any infection from the donation process itself. This is a common myth — the truth is, donation is completely safe.' },
        { q: 'What screening is done on donated blood?', a: 'Every unit is tested for: **HIV, Hepatitis B & C, Syphilis, Malaria, and other blood-borne pathogens**. In Bangladesh, all licensed blood banks follow WHO and DGHS guidelines for mandatory screening. Any unit that tests positive is safely discarded.' },
        { q: 'Can I donate blood after COVID-19?', a: '**Yes, after full recovery.** Wait 14 days after symptoms resolve (or 14 days after a positive test if asymptomatic). Vaccination does NOT require deferral. The antibodies in convalescent plasma may help current COVID patients.' },
        { q: 'Does donating blood weaken my immune system?', a: '**No.** Your body quickly replenishes blood cells. The temporary drop in red cells has no significant effect on immunity. In fact, regular donation may **stimulate bone marrow** to produce fresh, healthy blood cells — a mild health benefit!' },
        { q: 'How is donated blood stored?', a: '**Whole blood** is stored at **2-6°C** in refrigerated blood bank storage units. **Platelets** are stored at **20-24°C** with continuous agitation (shelf life only 5 days). **Plasma** is **frozen** and can last up to **1 year**. Each component has specific storage requirements.' },
        { q: 'How long can donated blood be stored?', a: '**Whole blood / Red blood cells:** up to **35-42 days** in CPDA-1 solution at 2-6°C. **Platelets:** only **5-7 days** at 20-24°C with agitation. **Fresh frozen plasma:** up to **1 year** at -18°C or colder. **Cryoprecipitate:** up to **1 year** frozen.' },
        { q: 'What happens to blood that expires?', a: 'Expired blood is **safely discarded** following biomedical waste management protocols. It cannot be used for transfusion. BloodBridge\'s inventory tracking helps blood banks minimize wastage by rotating stock and redistributing near-expiry units to facilities that can use them in time.' },
        { q: 'What is a transfusion reaction?', a: 'A transfusion reaction occurs when the recipient\'s immune system attacks the donor blood cells. Symptoms include: fever, chills, itching, shortness of breath, or dark urine. **Modern cross-matching reduces this risk to under 0.5%.** Always inform medical staff if you feel unwell during a transfusion.' },
        { q: 'Can I get a disease from a blood transfusion?', a: 'The risk is **extremely low** in Bangladesh for blood from licensed banks. All blood is screened for HIV, Hepatitis B/C, Syphilis, and Malaria. The risk of HIV from a screened transfusion is less than **1 in 1 million**. Always use blood from licensed, reputed blood banks.' },
        { q: 'Who can receive platelet transfusions?', a: 'Platelets are commonly given to: **cancer patients** (especially leukaemia) undergoing chemotherapy, **dengue patients** with low platelet count, **bone marrow transplant** recipients, **open heart surgery** patients, and patients with severe bleeding or platelet disorders.' },
        { q: 'Can I donate blood right after getting a vaccine?', a: '**Yes, for most vaccines** (COVID-19, flu, tetanus, Hepatitis B) — no waiting period needed if you feel well. For **live attenuated vaccines** (MMR, chickenpox, yellow fever, oral typhoid) — wait **2 weeks** to **4 weeks** depending on the vaccine. Always inform the screening staff about recent vaccinations.' },
        { q: 'Can I donate blood if I have Mad Cow Disease (vCJD) risk?', a: 'If you have lived in or visited the **UK** for 3+ months between 1980-1996, or lived in certain European countries during specific periods, you may be **permanently deferred** due to theoretical vCJD transmission risk. Check with your blood bank for current deferral guidelines.' },
        { q: 'What is the most common reason for blood donor deferral?', a: '**Low haemoglobin (anaemia)** is the most common reason — accounting for about **10-15%** of all donor deferrals. Other common reasons: recent illness or infection (8%), low/high blood pressure (5%), medication-related (4%), and recent travel (3%). Most deferrals are temporary.' },
        { q: 'Can I donate if I have haemophilia or von Willebrand disease?', a: '**No**, bleeding disorders like haemophilia A/B and von Willebrand disease are **permanent deferrals**. Donating blood could cause prolonged bleeding at the needle site and the blood itself may not provide normal clotting factors for recipients.' },
        { q: 'What is the smallest amount of blood needed for lab tests?', a: 'Blood banks take about **5-10ml** of blood for mandatory screening tests (HIV, HBV, HCV, Syphilis, Malaria, blood group confirmation). Some advanced blood banks also test for **HTLV, Chagas disease, and West Nile virus** based on donor travel history.' },
      ],
    },
    {
      category: 'Myths & Facts',
      icon: '🧠',
      items: [
        { q: 'Does donating blood cause weight gain?', a: '**No, that is a myth.** Donating blood removes about 350-450ml of blood, which weighs roughly 350-450 grams. You may feel hungry afterward, but that is your body telling you it needs energy to replenish — not actual fat gain. Eat a healthy meal, not extra calories!' },
        { q: 'Is it true that men can donate more often than women?', a: '**Yes, this is true.** Women have lower average iron stores due to menstruation. Guidelines recommend men donate **up to 6 times/year** and women **up to 4 times/year**. But the 56-day minimum interval applies to both.' },
        { q: 'Can I donate blood on an empty stomach?', a: '**No, this is dangerous.** Donating on an empty stomach increases your risk of fainting, dizziness, and nausea. Always eat a light meal 2-3 hours before and drink at least 500ml of water in the hour before donation.' },
        { q: 'Does blood donation hurt a lot?', a: 'Most donors describe it as a **brief pinch** lasting 2-3 seconds. After the needle is in, there is minimal discomfort. **90% of first-time donors say it was much less painful than expected.** The satisfaction of saving lives far outweighs the momentary pinch!' },
        { q: 'Do athletes and bodybuilders avoid blood donation?', a: '**No, many athletes donate regularly.** While you should avoid intense workouts on donation day, light training resumes the next day. Plasma volume is restored within 24 hours. Some studies even suggest regular donation may improve cardiovascular health.' },
        { q: 'Does donating blood cause hair loss?', a: '**No, a complete myth.** There is no scientific link between blood donation and hair loss. Hair loss is caused by genetics, hormones, stress, and nutritional deficiencies — none of which are triggered by donating blood every 8-12 weeks.' },
        { q: 'Does blood donation reduce heart disease risk?', a: '**Some studies suggest yes.** Regular blood donation may lower blood pressure and reduce the risk of heart attacks by **reducing iron stores**. Excess iron is linked to oxidative stress and cardiovascular damage. However, more research is needed to confirm this.' },
        { q: 'Does blood type determine personality or diet?', a: '**No, that is a pseudoscience.** The idea that blood type determines personality (Type A = calm, Type B = creative) or that you need a specific blood-type diet has **no scientific evidence**. Blood type only matters for transfusions and pregnancy Rh compatibility.' },
        { q: 'Is blood donation addictive?', a: '**No, physically it is not addictive.** However, many donors describe the feeling of saving a life as "fulfilling" or "rewarding." The emotional satisfaction can make you want to donate again — but that is compassion, not addiction! We encourage that feeling!' },
        { q: 'Does donating blood weaken athletes permanently?', a: '**No.** While you should rest on donation day, your plasma volume normalizes within 24 hours and red blood cells within 4-6 weeks. Many elite athletes donate regularly during off-seasons. The long-term health benefits (reduced iron levels, cardiovascular health) may even help performance.' },
        { q: 'Does donating blood make you look older?', a: '**No, another myth.** Donating blood has no effect on skin ageing, wrinkles, or appearance. In fact, regular donation may slightly improve skin health by reducing excess iron, which is linked to oxidative stress. You will feel proud, not older!' },
        { q: 'Does blood donation cause permanent weakness or fatigue?', a: '**No.** Any tiredness after donation is **temporary** and resolves within 24-48 hours as your plasma volume is restored. Your body efficiently compensates. If you feel weak for more than a few days, it may indicate low iron — eat iron-rich foods and consult your doctor.' },
        { q: 'Is it true that donating blood makes you more hungry all the time?', a: '**Temporarily, yes, but only for a day.** Your body needs extra energy to replenish blood cells, which may increase appetite for 24-48 hours. This is a normal biological response. Eat healthy meals, but you do not need to significantly increase your calorie intake.' },
        { q: 'Does donating blood affect fertility or reproductive health?', a: '**No, not at all.** There is no scientific evidence that blood donation affects fertility in men or women. Your body quickly replenishes the donated blood cells, and reproductive hormones remain unaffected. Millions of people worldwide donate regularly and have healthy children.' },
        { q: 'Does blood donation make you more likely to catch colds or flu?', a: '**No.** While there is a temporary, mild dip in some immune markers after donation, your immune system remains fully functional. Studies show **no increased risk** of infections after blood donation. In fact, regular donation may stimulate bone marrow to produce fresh, healthy immune cells.' },
      ],
    },
    {
      category: 'Registration & Login Help',
      icon: '🔐',
      items: [
        { q: 'How do I create an account on BloodBridge?', a: 'Click **Login** → **Sign Up**. Choose your role: Donor, Hospital, Blood Bank, Delivery Staff, etc. Fill in your details and verify your email/phone. After approval (instant for donors, 24-48h for institutions), you can access your dashboard.' },
        { q: 'I forgot my password. How do I reset it?', a: 'Click **Login** → **Forgot Password?**. Enter your registered email. You will receive a password reset link. If you don\'t receive it within 5 minutes, check your spam folder or contact support at support@bloodbridge.com.' },
        { q: 'Can I update my blood type or location?', a: 'Yes! Go to your dashboard → **Profile Settings**. You can update your blood type, location, contact info, and donation preferences. Blood type changes require re-verification by a registered lab for safety.' },
        { q: 'Is my personal information secure?', a: '**Absolutely.** We use industry-standard **end-to-end encryption**, secure HTTPS connections, and follow Bangladesh\'s Data Protection guidelines. Your health information is shared only with verified blood banks and screening staff — never with third parties.' },
        { q: 'I am not receiving the OTP, what should I do?', a: 'First, check your **spam folder**. Ensure you entered the correct phone number/email. Wait **2-3 minutes** and try again. If still not received, you can request a **voice OTP** (for phone) or contact support at support@bloodbridge.com for manual verification.' },
        { q: 'Can I delete my account?', a: '**Yes.** Go to **Profile Settings** → **Delete Account**. Your data will be permanently removed within 30 days. If you have active requests, please resolve them before deletion. You can also temporarily **deactivate** your account instead.' },
        { q: 'What if I forgot my registered email?', a: 'Contact **support@bloodbridge.com** with your full name, phone number, and any other details you remember. Our support team will verify your identity and help recover your account. You may need to provide your NID for verification.' },
        { q: 'Can I sign up without a phone number?', a: 'A **phone number is required** for donor verification and emergency notifications. However, you can use a landline number if you do not have a mobile. Email-only registration is not available due to the urgent nature of blood requests.' },
        { q: 'How do I update my profile picture?', a: 'Go to your **Dashboard** → **Profile Settings** → Click on your current avatar/photo. Upload a clear photo of your face. Photos help donors/recipients identify each other during handoff. Ensure the photo follows community guidelines.' },
      ],
    },
    {
      category: 'AI Assistant Help',
      icon: '🤖',
      items: [
        { q: 'What can I ask Raktosathi AI?', a: 'You can ask me **anything** about: blood donation eligibility, preparation tips, aftercare, blood groups, platform features, emergency requests, health myths, and more! I can also answer general questions, provide health information, and chat casually. I am your 24/7 Blood Companion 🩸' },
        { q: 'Can Raktosathi diagnose medical conditions?', a: '**No, I cannot diagnose diseases.** I provide informational guidance about blood donation and general health. Always consult a qualified doctor for medical diagnosis, treatment, or emergencies. If you feel unwell, please seek professional medical help immediately.' },
        { q: 'Can I chat in Bangla?', a: '**Yes, absolutely!** Raktosathi understands both English and বাংলা. Feel free to ask questions in either language. আমি আপনার প্রশ্নের উত্তর বাংলায় দিতে পারি। BloodBridge is built for Bangladesh, and our AI is bilingual!' },
        { q: 'Is the chatbot free?', a: '**Yes, completely free!** You can chat with Raktosathi AI as much as you want, whether you are a registered user or a guest. Your conversations are stored temporarily in your browser for context.' },
        { q: 'How accurate is Raktosathi\'s information?', a: 'Raktosathi uses advanced AI (Gemini, Groq, and other models) combined with a reliable fallback system built from verified medical guidelines. While I strive for 100% accuracy, always verify critical information with healthcare professionals or official blood bank authorities.' },
        { q: 'Who developed Raktosathi?', a: 'Raktosathi AI is developed by the **BloodBridge** team — a passionate group of developers, healthcare professionals, and volunteers dedicated to revolutionizing blood donation and distribution in Bangladesh through technology.' },
        { q: 'Can Raktosathi AI help in an emergency right now?', a: '**I can guide you**, but I am not connected to live emergency dispatch. If you need **immediate blood**, click the **🚨 Emergency Request** button on the platform or call **08000-123-456**. I can provide first-aid advice and help you fill the request form.' },
        { q: 'Can Raktosathi AI find nearby hospitals?', a: '**Yes!** Tell me your location, and I can list nearby hospitals with blood banks, their contact numbers, and distance. You can also use the **Find Blood** feature on the website for a map view with real-time donor availability.' },
        { q: 'Does Raktosathi AI learn from conversations?', a: 'Your conversations help improve my responses. I use **context from your current session** to provide relevant answers. Your chat data is stored locally in your browser and is not shared externally. We value your privacy.' },
        { q: 'Can I give feedback on Raktosathi AI responses?', a: '**Absolutely!** Use the **👍 / 👎** buttons on my responses, or email feedback to **feedback@bloodbridge.com**. Your feedback helps us improve accuracy, add new topics, and serve you better. We read every submission!' },
        { q: 'Is Raktosathi AI available 24/7?', a: '**Yes!** I am here for you **anytime, day or night** — 24 hours a day, 365 days a year. Whether it\'s 3 AM or a public holiday, I\'m always ready to answer your questions about blood donation, emergencies, and health information.' },
        { q: 'Can Raktosathi AI help with appointment scheduling?', a: '**Yes**, I can help you find nearby blood banks and their operating hours. I can guide you on when to visit, what to bring, and how to prepare. For direct appointment booking, please use the **Book Donation** feature on the platform dashboard.' },
      ],
    },
    {
      category: 'Bangladesh Blood Donation Guide',
      icon: '🇧🇩',
      items: [
        { q: 'What are the blood donation rules in Bangladesh?', a: 'Bangladesh follows WHO and DGHS guidelines: donors must be 18-65 years, ≥50kg weight, haemoglobin ≥12.5 g/dL, with a 56-day minimum interval between donations. All blood must be screened for HIV, HBV, HCV, Syphilis, and Malaria before transfusion.' },
        { q: 'Which organizations coordinate blood donation in Bangladesh?', a: 'Key organizations include: **Sandhani** (student-based, largest voluntary network), **Badhon** (Rotary club affiliated), **Quantum Foundation**, **BRAC** blood programs, and the **Department of Transfusion Medicine** at government hospitals. BloodBridge works with many of these partners.' },
        { q: 'What is the blood shortage situation in Bangladesh?', a: 'Bangladesh faces a **shortage of 500,000+ units** annually. Only ~40% of the need is met through voluntary donations. The rest comes from replacement donations (family/friends). This is why platforms like BloodBridge are crucial — to increase voluntary, regular donation.' },
        { q: 'How does BloodBridge help Bangladesh\'s blood crisis?', a: 'BloodBridge addresses the crisis through **real-time donor matching, emergency alerts, inventory tracking across all blood banks, location-based services, and analytics** for better resource allocation. Our goal is to eliminate blood shortages in Bangladesh through technology.' },
        { q: 'What is Sandhani and how does it work?', a: '**Sandhani** is Bangladesh\'s largest voluntary blood donation organization, run by medical students. Founded at DMCH, it now has branches in all medical colleges. It organizes regular donation camps, maintains a donor database, and supplies blood to hospital blood banks across the country.' },
        { q: 'What is the legal age for blood donation in Bangladesh?', a: 'The legal age for blood donation in Bangladesh is **18 to 65 years**. Minors (under 18) cannot donate even with parental consent. First-time donors over 60 may be accepted at the blood bank physician\'s discretion if they are in excellent health.' },
        { q: 'Is selling blood legal in Bangladesh?', a: '**No, selling blood is illegal in Bangladesh.** The Blood Donation Act and DGHS guidelines strictly prohibit the sale and purchase of blood. Blood must be donated voluntarily. Commercial blood trading carries legal penalties. BloodBridge operates on a 100% voluntary donation model.' },
        { q: 'How many blood banks are in Bangladesh?', a: 'Bangladesh has approximately **250+ licensed blood banks** across the country. These include government hospital banks, private hospital banks, standalone non-profit banks, and military/defence blood banks. Dhaka has the highest concentration with 60+ banks.' },
        { q: 'Do blood banks in Bangladesh charge for blood?', a: 'The **blood itself is free** (all donations are voluntary). However, blood banks may charge **processing fees** covering: screening tests, storage, cross-matching, and administrative costs. Typical processing fees are **500-1500 BDT per unit** depending on the bank and blood type.' },
        { q: 'How does the government support blood donation?', a: 'The **Government of Bangladesh** supports through: the **National Blood Transfusion Policy**, **DGHS** regulatory oversight, licensing and inspection of blood banks, free screening test kits at government hospitals, and awareness campaigns through **Health Education Bureau** and **BSMMU**.' },
        { q: 'Can foreigners donate blood in Bangladesh?', a: '**Yes**, foreigners residing in Bangladesh can donate blood if they meet the same eligibility criteria. They must have a **valid passport or residence permit**, have been in Bangladesh for at least **6 months** (or 3 years if from certain countries with high vCJD risk), and pass the standard health screening.' },
        { q: 'Is blood donation allowed on public holidays and weekends?', a: '**Yes**, many blood banks operate **365 days a year** including public holidays. Emergency blood services are always available. However, regular donation centre hours may vary on holidays. BloodBridge partner centres post their holiday schedules. Check the platform for real-time availability.' },
        { q: 'What is the National Blood Transfusion Policy of Bangladesh?', a: 'The **National Blood Transfusion Policy** (2010, updated 2021) aims to: ensure 100% voluntary blood donation, establish quality standards for all blood banks, mandate universal screening of donated blood, promote rational use of blood, and establish a national blood transfusion network. It is overseen by **DGHS** and **BSMMU**.' },
        { q: 'What is World Blood Donor Day and how is it observed in Bangladesh?', a: '**World Blood Donor Day** is celebrated on **June 14** each year, the birthday of Karl Landsteiner (discoverer of blood types). In Bangladesh, blood banks, Sandhani, Badhon, Quantum, and BloodBridge organize **free camps, awareness rallies, donor recognition events, and health check-up camps** to honour donors.' },
        { q: 'What is the role of Bangladesh Red Crescent in blood donation?', a: 'The **Bangladesh Red Crescent Society (BDRCS)** supports blood donation through: organizing voluntary blood donation camps across the country, providing first-aid training for blood bank staff, assisting in disaster response blood collection, running youth programmes for donor awareness, and collaborating with BloodBridge for emergency blood alerts.' },
        { q: 'How many licensed blood banks are in each division of Bangladesh?', a: 'As of 2024, the approximate distribution: **Dhaka** (80+), **Chattogram** (35+), **Rajshahi** (25+), **Khulna** (20+), **Sylhet** (18+), **Barishal** (12+), **Rangpur** (15+), **Mymensingh** (10+). Dhaka has the highest concentration. BloodBridge is working to increase blood bank density in underserved divisions.' },
      ],
    },
    {
      category: 'Blood Components & Uses',
      icon: '🩸',
      items: [
        { q: 'What are the different blood components?', a: 'Whole blood is separated into: **Red Blood Cells (RBC)** — carry oxygen; **Platelets** — help clotting; **Plasma** — liquid portion with proteins; **Cryoprecipitate** — clotting factors; and **Fresh Frozen Plasma (FFP)**. One donation can help **multiple patients** through component separation!' },
        { q: 'What is platelet-rich plasma (PRP)?', a: '**Platelet-Rich Plasma (PRP)** is plasma with a concentrated platelet count. It is used in **orthopaedics** (joint injections), **dermatology** (hair restoration, skin rejuvenation), and **wound healing**. PRP is typically prepared from the patient\'s own blood (autologous).' },
        { q: 'Who needs platelet transfusions?', a: 'Platelets are vital for: **dengue patients** with critically low platelets, **cancer patients** (leukaemia, lymphoma) undergoing chemotherapy, **bone marrow transplant** recipients, **trauma patients** with massive bleeding, and patients with platelet disorders like ITP or aplastic anaemia.' },
        { q: 'What is fresh frozen plasma (FFP) used for?', a: '**FFP** is used to treat: bleeding in patients with **liver disease** (reduced clotting factors), **massive transfusion** situations, **warfarin reversal** in emergencies, **DIC** (disseminated intravascular coagulation), and rare clotting factor deficiencies. It contains all clotting factors.' },
        { q: 'What is cryoprecipitate?', a: '**Cryoprecipitate** is the cold-insoluble portion of plasma, rich in **Factor VIII, von Willebrand Factor, fibrinogen, and Factor XIII**. It is used for: haemophilia A, von Willebrand disease, fibrinogen deficiency, and as a glue in certain surgeries. It is often called "cryo" for short.' },
        { q: 'How is whole blood separated into components?', a: 'After donation, whole blood is **centrifuged** (spun at high speed) to separate layers by density: RBCs settle at the bottom, a **buffy coat** (platelets + WBCs) in the middle, and plasma on top. The components are then extracted into separate sterile bags.' },
        { q: 'What is single-donor platelet (apheresis)?', a: '**Single-donor platelets** are collected through **apheresis** — a machine that draws blood, extracts only platelets, and returns the rest to the donor. This takes 60-90 minutes but provides a full dose from one donor, reducing infection risk and helping patients who need frequent transfusions.' },
        { q: 'What is granulocyte donation?', a: '**Granulocytes** (a type of white blood cell) can be donated through apheresis to help patients with severe infections who are not responding to antibiotics. Donors receive medication before donation to increase granulocyte counts. This is a less common but life-saving donation type.' },
      ],
    },
    {
      category: 'Hospital & Blood Bank Management',
      icon: '🏨',
      items: [
        { q: 'How do blood banks manage inventory?', a: 'Blood banks use a **First-In-First-Out (FIFO)** system. RBCs expire in 35-42 days, platelets in 5-7 days. BloodBridge\'s platform provides **real-time inventory tracking**, expiry alerts, stock level warnings, and redistribution suggestions to minimize wastage.' },
        { q: 'What is cross-matching of blood?', a: '**Cross-matching** is a lab test performed before transfusion to confirm that the donor\'s blood is compatible with the recipient\'s. It mixes a small sample of donor RBCs with recipient plasma — if no reaction occurs, the blood is safe to transfuse. This prevents life-threatening transfusion reactions.' },
        { q: 'How do hospitals request blood from BloodBridge?', a: 'Hospital staff log into their **Hospital Dashboard**, enter patient blood type, units needed, urgency, and location. The system shows available stock at nearby blood banks and compatible donors. Hospitals can request from **banks** (for immediate stock) or **donors** (for fresh donation).' },
        { q: 'How does BloodBridge help reduce blood wastage?', a: 'BloodBridge reduces wastage through: **real-time inventory tracking** across banks, **near-expiry alerts** to use or redistribute units, **demand forecasting** based on historical data, **cross-bank transfers** of about-to-expire blood, and **donor scheduling** to match supply with demand.' },
        { q: 'What is a blood bank management system?', a: 'A **Blood Bank Management System (BBMS)** is a software platform that handles: donor registration, blood collection, component separation, screening records, inventory tracking, cross-matching, issue and transfusion logging, and reporting. BloodBridge\'s BBMS is cloud-based and accessible from any device.' },
        { q: 'How do blood banks ensure cold chain maintenance?', a: 'Blood banks maintain the **cold chain** through: refrigerated storage at **2-6°C**, temperature-controlled transport boxes, **24/7 temperature monitoring** with alarms, backup generators, validated coolers for transport, and strict **Time-Out-of-Refrigeration** limits (max 30 minutes for RBCs).' },
        { q: 'What is the massive transfusion protocol?', a: '**Massive Transfusion Protocol (MTP)** is a hospital emergency plan for patients who need **10+ units of blood in 24 hours** (e.g., trauma, childbirth bleeding). The protocol activates rapid delivery of RBCs, plasma, and platelets in a balanced ratio (typically 1:1:1) to prevent coagulopathy.' },
        { q: 'Can blood banks transfer blood between each other?', a: '**Yes**, blood banks with surplus stock can transfer near-expiry units to other facilities. BloodBridge facilitates **inter-bank transfers** by showing real-time availability and needs across all partner banks. This redistributes stock efficiently and prevents wastage.' },
      ],
    },
    {
      category: 'Delivery & Logistics',
      icon: '🚚',
      items: [
        { q: 'How is blood transported safely?', a: 'Blood is transported in **validated cold boxes** with ice packs or cooling elements to maintain **2-6°C** for RBCs. Plasma is transported frozen. Each container has a **temperature logger** to ensure the cold chain is never broken. Delivery staff are trained in proper handling procedures.' },
        { q: 'Can blood be delivered urgently at night?', a: '**Yes**, BloodBridge coordinates **24/7 emergency delivery**. When an urgent request is placed at night, nearby verified donors and delivery personnel are notified. Partner blood banks with 24-hour access can dispense blood at any hour. Our helpline **08000-123-456** operates 24/7 for coordination.' },
        { q: 'What is the cold chain for blood transport?', a: 'The **cold chain** is a temperature-controlled supply chain: blood is stored at **2-6°C** in the blood bank → transferred to a **pre-cooled transport box** → delivered within a strict time window → immediately placed in the hospital\'s refrigerator. The temperature is monitored throughout.' },
        { q: 'How does BloodBridge track delivery?', a: 'BloodBridge provides **live GPS tracking** of delivery personnel once they accept a request. The requester can see the delivery person\'s location, estimated arrival time, and contact information. Delivery status is updated at every stage: Accepted → Picked Up → In Transit → Delivered.' },
        { q: 'What vehicles are used for blood transport?', a: 'Blood is transported in: **dedicated BloodBridge delivery bikes** with cold boxes (for urban areas), **ambulances** (for critical emergencies), and **temperature-controlled vans** (for bulk inter-bank transfers). All vehicles have secure storage and temperature monitoring.' },
        { q: 'How far can blood be transported safely?', a: 'For **RBCs**, transport time should not exceed **4 hours** at 2-6°C in a validated container (urban radius ~50km). For longer distances, blood is transported in **temperature-monitored vehicles** with backup cooling. **Plasma** (frozen) can be transported across the country within 24-48 hours.' },
        { q: 'Are delivery staff trained for blood transport?', a: '**Yes**, all BloodBridge delivery personnel undergo certified training covering: cold chain maintenance, proper handling of blood bags, emergency procedures, biohazard safety, patient confidentiality, and customer communication. Refresher training is conducted quarterly.' },
      ],
    },
    {
      category: 'Volunteer & Community Programs',
      icon: '🤝',
      items: [
        { q: 'How can I organize a blood donation camp?', a: 'Contact BloodBridge via **camp@bloodbridge.com** or call **08000-123-456**. We help with: venue arrangement (if needed), donor mobilization through SMS and social media, medical team coordination, equipment supply (beds, bags, screening kits), and refreshments. We recommend at least **2 weeks advance planning**.' },
        { q: 'How can I become a BloodBridge volunteer?', a: 'Go to the website → **Get Involved** → **Volunteer**. Fill out the application with your skills (medical, logistics, tech, social media, or general). Volunteers help with: camp organization, donor awareness, social media campaigns, emergency coordination, and community outreach.' },
        { q: 'Can companies organize corporate blood drives?', a: '**Absolutely!** BloodBridge partners with companies for **Corporate Social Responsibility (CSR)** blood drives. We bring the entire setup to your office — registration, screening, donation, and post-donation care. It takes 4-6 hours and can collect 50-200+ units depending on employee participation.' },
        { q: 'How can students get involved in blood donation?', a: 'Students can: **join Sandhani** at their medical college, **register as donors** on BloodBridge, **organize campus blood drives**, participate in **awareness rallies**, create social media content, or **volunteer** at donation camps. Many universities offer certificates and recognition for regular donors.' },
        { q: 'What rewards does BloodBridge offer for regular donors?', a: 'BloodBridge offers: **digital badges** (Bronze: 5 donations, Silver: 10, Gold: 25, Platinum: 50+), **donation certificates**, **priority notifications** for elite donors, **public recognition** on our donor wall (with consent), **health check-up discounts** from partner clinics, and **exclusive BloodBridge merchandise**.' },
        { q: 'Can I host a blood donation awareness event?', a: '**Yes!** BloodBridge provides **free awareness materials**: posters, brochures, presentation slides, videos, and even a **BloodBridge speaker** for events. Topics include: why donate, who can donate, debunking myths, and how BloodBridge works. Contact **awareness@bloodbridge.com** to schedule.' },
        { q: 'How can schools and colleges participate?', a: 'Schools and colleges can: host **annual blood donation camps**, form **BloodBridge campus clubs** (clubs get activity certificates), participate in **inter-college donation competitions**, run **awareness weeks**, and invite guest lectures from BloodBridge. We also offer **career counselling sessions** for students interested in healthcare.' },
        { q: 'What is the BloodBridge donor recognition program?', a: 'Our **Donor Recognition Program** honours frequent donors: **Plasma Club** (5+ donations), **Gold Drop Club** (25+ donations), **Lifesaver Circle** (50+ donations), and **Hall of Fame** (100+ donations). Recognized donors get priority matching, exclusive events, and public acknowledgment on our website.' },
      ],
    },
    {
      category: 'Mobile App & Notifications',
      icon: '📱',
      items: [
        { q: 'Does BloodBridge have a mobile app?', a: '**Yes**, BloodBridge is available as a **Progressive Web App (PWA)** that works on both Android and iOS. You can add it to your home screen from the website for an app-like experience. A native Android and iOS app is under development and coming soon!' },
        { q: 'Can I get SMS notifications for requests?', a: '**Yes**, all registered donors receive **SMS alerts** when a compatible emergency request is placed nearby. You can also opt for **email notifications**, **in-app push notifications** (PWA), or **WhatsApp alerts**. You control your notification preferences in your dashboard settings.' },
        { q: 'How does GPS-based donor matching work?', a: 'When you register, you can **share your location** (or enter a fixed address). When a blood request is made, BloodBridge calculates the **distance from each compatible donor** to the patient\'s location. Donors within the chosen radius are notified in order of proximity and response history.' },
        { q: 'Can I use BloodBridge without an internet connection?', a: 'The BloodBridge website requires an internet connection to function. However, **SMS notifications** work without internet. You can also preload the **PWA** (add to home screen) for faster loading when you do have connectivity. Offline access to your donor history is coming soon.' },
        { q: 'What SMS notifications will I receive?', a: 'Donors receive SMS for: **new matching requests** (with blood type, location, and urgency), **reminders** when eligible to donate again, **camp and event invitations**, and **emergency escalation** alerts. You can opt out of non-critical SMS in your notification settings.' },
        { q: 'How do I enable notifications on my phone?', a: 'For **PWA**: Open the BloodBridge website in Chrome → tap the menu → "Add to Home Screen" → allow notifications when prompted. For **SMS**: Ensure your phone number is verified in your profile. Go to **Settings** → **Notifications** to customize your preferences.' },
      ],
    },
    {
      category: 'Special Donation & Medical Cases',
      icon: '🏥',
      items: [
        { q: 'What is directed donation?', a: '**Directed donation** is when a donor specifically names the patient who should receive their blood (e.g., a family member or friend needing surgery). The blood is still tested and screened the same way. Directed donations are arranged through the hospital blood bank in advance.' },
        { q: 'What is autologous blood donation?', a: '**Autologous donation** means donating blood for **your own use** before a planned surgery. Your blood is collected 2-4 weeks before the operation and stored for you. This eliminates the risk of transfusion reactions or infections. It is recommended for patients undergoing elective major surgeries.' },
        { q: 'What is cord blood donation?', a: '**Cord blood** is blood collected from the **umbilical cord and placenta after childbirth**. It is rich in **stem cells** used to treat blood cancers (leukaemia, lymphoma), genetic disorders, and immune system diseases. Cord blood banks store these cells for transplantation.' },
        { q: 'Can I donate blood for a family member\'s surgery?', a: '**Yes**, this is called **replacement donation** or **directed donation**. Inform the hospital blood bank in advance. You must meet all standard eligibility criteria. The blood will still be fully screened. Having family members donate helps ensure adequate hospital supply.' },
        { q: 'What is therapeutic phlebotomy?', a: '**Therapeutic phlebotomy** is the removal of blood as a **medical treatment**, not for donation. It is used for conditions with **excess iron** (haemochromatosis), **polycythaemia vera** (too many RBCs), and other blood disorders. The blood is usually discarded unless the patient qualifies as a donor.' },
        { q: 'Can I donate if I received a blood transfusion?', a: 'If you received a **blood transfusion**, you must wait **12 months** before donating. This is a safety precaution to prevent transmission of diseases that may not be detectable immediately. If you received **blood products** (clotting factors, etc.), the same waiting period applies.' },
        { q: 'What is convalescent plasma donation?', a: '**Convalescent plasma** is plasma collected from someone who has **recovered from an infection** (e.g., COVID-19). Their plasma contains antibodies that can help current patients fight the same infection. This was used during the COVID-19 pandemic and may be used for future outbreaks.' },
      ],
    },
    {
      category: "Women\u2019s Health & Blood Donation",
      icon: '\uD83D\uDC69\u200D\u2764\uFE0F',
      items: [
        { q: 'Can women donate blood during menstruation?', a: '**Yes**, you can donate during your period if you feel well, are not experiencing severe cramps, and are not experiencing heavy bleeding. Your iron levels may be slightly lower, so eating iron-rich foods beforehand helps. Drink extra water to compensate for fluid loss.' },
        { q: 'How long after pregnancy can I donate blood?', a: '**Wait 6 months** after delivery (vaginal or C-section). If you are breastfeeding, wait at least **3 months after weaning** or 6 months after delivery, whichever is later. Pregnancy depletes iron stores, and your body needs time to recover before donation.' },
        { q: 'Can I donate blood if I have PCOS?', a: '**Yes**, Polycystic Ovary Syndrome (PCOS) does not prevent blood donation. PCOS is a hormonal condition and does not affect the safety of your blood. Common PCOS medications like metformin are generally acceptable. Always disclose your full medication list during screening.' },
        { q: 'Can I donate blood if I have endometriosis?', a: '**Yes**, endometriosis alone does not prevent donation. If you are not experiencing severe symptoms, anaemia, or taking blood-thinning medications, you can donate. Inform the screening staff if you have significant pain or heavy menstrual bleeding related to endometriosis.' },
        { q: 'Can I donate while on birth control or contraceptive injections?', a: '**Yes**, all forms of contraception (pills, injections, IUDs, implants, patches) are perfectly fine for blood donation. No waiting period needed. Contraceptive medications do not affect blood safety.' },
        { q: 'Can I donate blood during menopause?', a: '**Yes**, menopause does not affect your ability to donate blood. In fact, after menopause, iron stores tend to increase (due to cessation of menstruation), which may make it easier to meet the haemoglobin requirement. Donating can help maintain healthy iron levels.' },
        { q: 'Why are women recommended to donate less frequently than men?', a: 'Women have **lower average iron stores** due to monthly blood loss during menstruation. Guidelines recommend a **minimum 56-day interval** for both genders, but women are limited to **4 donations per year** while men can donate up to **6 times per year**. This reduces the risk of iron deficiency anaemia.' },
        { q: 'Can I donate blood if I had a miscarriage or abortion?', a: '**Yes**, but wait **6 months** after a miscarriage or abortion to allow your body to fully recover and replenish iron stores. If there were complications (haemorrhage, infection), wait until your doctor confirms you are fully recovered.' },
        { q: 'Can I breastfeed after donating blood?', a: '**Yes**, breastfeeding after blood donation is safe for both mother and baby. Your body prioritises milk production. However, drink extra fluids and eat well to compensate for the blood loss. If you feel dizzy or weak, rest before breastfeeding.' },
      ],
    },
    {
      category: 'Fasting, Religion & Blood Donation',
      icon: '\uD83D\uDD4B',
      items: [
        { q: 'Can I donate blood while fasting during Ramadan?', a: '**Yes, if you are healthy and well-hydrated.** In Bangladesh, many blood banks operate extended hours during Ramadan to accommodate donors after **Iftar** (breaking the fast). The best time to donate is **after Iftar** or before **Sehri**. Drink plenty of water and eat dates or iron-rich foods when breaking your fast. If you feel weak, postpone donation.' },
        { q: 'Is blood donation allowed in Islam?', a: '**Yes**, blood donation is **permissible (halal) in Islam**. Major Islamic scholars and organizations (including Al-Azhar, Islamic Foundation Bangladesh, and Darul Ifta) agree that blood donation to save lives is a noble act and fully allowed. It falls under the principle of **saving a life = saving all humanity** (Quran 5:32). It does NOT break the fast if done during Ramadan, though scholars recommend donating after Iftar to avoid weakness.' },
        { q: 'What do other religions say about blood donation?', a: '**Hinduism**: Blood donation is encouraged as **dana** (charity) and **seva** (selfless service). **Buddhism**: Strongly encouraged as a compassionate act. **Christianity**: Supported as a charitable act of love. **Jehovah\'s Witnesses**: They do not accept blood **transfusions**, but individual members may choose to **donate** blood — beliefs vary. Most major religions support voluntary blood donation.' },
        { q: 'Can I donate blood if I am fasting for other reasons?', a: '**It is not recommended.** Donating blood on an empty stomach increases the risk of fainting, dizziness, and nausea. If you are fasting for religious or health reasons, **break your fast first**, eat a light meal, drink water, wait 30 minutes, then donate. Your safety comes first.' },
        { q: 'Do blood banks in Bangladesh stay open during Ramadan?', a: '**Yes**, most blood banks operate **365 days a year**, including Ramadan. Many adjust their hours — opening later in the morning and staying open later at night to accommodate donors after Iftar. Emergency blood services are available 24/7 regardless of Ramadan. Check BloodBridge for specific centre hours.' },
        { q: 'Can I donate blood on religious holidays like Eid?', a: '**Yes**, blood banks remain open on Eid and other religious holidays. However, hours may be reduced. Many people choose to donate on Eid as an act of charity. BloodBridge partner centres usually post their holiday schedule in advance. Emergency services are unaffected.' },
      ],
    },
    {
      category: 'Nutrition for Blood Health',
      icon: '\uD83E\uDD57',
      items: [
        { q: 'Which Bangladeshi foods are best for boosting iron before donation?', a: 'Bangladesh has many iron-rich foods: **spinach (palong shak)**, **red amaranth (lal shak)**, **lentils (dal, especially masoor and mung)**, **black chickpeas (kala chola)**, **dates (khajur)**, **beetroot (beet)**, **lean red meat (goru mangsho)**, **liver (kolija — but limit to once a week)**, **fortified rice**, and **tamarind (tetul)**. Pair with vitamin C (lemon, orange, amlaki) for better absorption.' },
        { q: 'What should I eat the night before donating blood?', a: 'Have a **balanced dinner** with: iron-rich vegetables or meat, whole grains (rice or roti), and a source of vitamin C (lemon water, orange). **Example meal**: Spinach dal with rice + a piece of grilled chicken or fish + a glass of orange juice. Avoid fatty, fried, or oily foods.' },
        { q: 'What should I drink before donating blood?', a: 'Drink **500ml of water** about 30-60 minutes before donation. Also good: **fruit juices** (orange, pomegranate, beetroot juice), **coconut water** (natural electrolytes), **ORS solution** (for extra hydration), and **smoothies** with iron-rich fruits. **Avoid:** caffeinated drinks (tea, coffee, cola) in excess — they can dehydrate you.' },
        { q: 'Which fruits help increase haemoglobin?', a: '**Pomegranate (dalim)** — one of the best fruits for blood health. **Beetroot (beet)** — rich in iron and folate. **Watermelon (tormuj)** — contains iron and lycopene. **Dates (khajur)** — excellent natural source of iron. **Oranges/lemus** — vitamin C helps iron absorption. **Apples (apple)** — modest iron with quercetin for blood vessel health.' },
        { q: 'Should I take iron supplements before donating?', a: 'If you are a **regular donor** (3+ times/year), consider taking an **iron supplement** (ferrous fumarate 200mg) daily for 8 weeks before donation, or on alternate days. **Occasional donors** usually maintain adequate iron through diet. **Do not start supplements** without consulting a doctor — excess iron is harmful. BloodBridge partners with labs offering **ferritin testing**.' },
        { q: 'How does vitamin C help with blood donation?', a: 'Vitamin C **greatly enhances iron absorption** from plant-based foods (up to 6x better). It also helps your body recover faster after donation. **Sources:** Lemon water, orange juice, amlaki (Indian gooseberry), guava (peyara), green chili, cabbage, tomatoes. **Tip:** Drink a glass of lemon water or orange juice with your pre-donation meal.' },
        { q: 'What foods should I avoid before donating blood?', a: '**Avoid 24 hours before:** Fatty, fried, and oily foods (paratha, samosa, deep-fried snacks, rich curries) — they can interfere with blood screening tests (making plasma appear lipaemic/milky). **Avoid:** Alcohol (24 hours), excessive caffeine (can raise BP and dehydrate), and very spicy food (may cause discomfort).' },
        { q: 'Can I donate blood if I am on a weight loss diet?', a: '**Yes**, if you are eating a balanced diet and meeting your nutritional needs. Avoid donating during **very low-calorie** or **keto diets** — low carbohydrate intake can cause dizziness during donation. **Intermittent fasting** — break your fast before donating. Eat a normal meal 2-3 hours before and stay hydrated.' },
      ],
    },
    {
      category: 'Transfusion Recipient Guide',
      icon: '\uD83D\uDC8A',
      items: [
        { q: 'What should a patient know before receiving a blood transfusion?', a: 'Your doctor will explain why you need blood, obtain your **informed consent**, and check your blood type. You may have a **fever, chills, or mild allergic reaction** — these are usually manageable. Severe reactions are rare (<1%). Your **vital signs** are monitored throughout. The transfusion takes 1-4 hours per unit.' },
        { q: 'How is blood matched to a recipient?', a: 'Blood matching involves: 1) **ABO/Rh typing** of the recipient, 2) **Cross-matching** — mixing donor RBCs with recipient plasma to confirm compatibility, 3) **Antibody screening** — checking for unusual antibodies. This process takes **30-60 minutes** in a lab. In emergencies, **O-negative** (universal donor) blood may be used.' },
        { q: 'What are the alternatives to blood transfusion?', a: 'Alternatives include: **Iron therapy** (oral or IV) for anaemia, **Erythropoietin (EPO)** to stimulate RBC production, **Volume expanders** (saline, Hartmann\'s solution) for blood loss without anaemia, **Cell salvage** (recycling your own blood during surgery), and **Autologous donation** (using your own pre-donated blood).' },
        { q: 'Can a patient refuse a blood transfusion?', a: '**Yes**, competent adult patients have the right to refuse any medical treatment, including blood transfusions (informed refusal). This is common among Jehovah\'s Witnesses. Doctors must respect this decision and explore alternatives. In **life-threatening emergencies** involving minors, courts may override parental refusal.' },
        { q: 'How long does a blood transfusion take?', a: 'A single unit of **red blood cells** takes **2-4 hours** to transfuse. **Plasma** takes 30-60 minutes. **Platelets** take 30-60 minutes per dose. The first 15 minutes are the slowest — the nurse monitors for any adverse reaction, then the rate is increased if all is well.' },
        { q: 'What are the signs of a transfusion reaction?', a: '**Watch for:** Fever or chills, shortness of breath, itching or hives, dark urine, back or chest pain, sudden headache, low blood pressure, or anxiety. If you experience any of these during a transfusion, **tell the nurse immediately**. They will stop the transfusion and assess you.' },
        { q: 'How much does a blood transfusion cost in Bangladesh?', a: 'The **blood itself is free** (from voluntary donors). However, hospitals charge a **processing fee** covering: blood group typing, cross-matching, screening tests (HIV, HBV, HCV, Syphilis, Malaria), storage, and administration. In Bangladesh, this typically ranges from **500-2,500 BDT per unit** depending on the hospital and blood type needed.' },
      ],
    },
    {
      category: 'Global & Regional Blood Facts',
      icon: '\uD83C\uDF0D',
      items: [
        { q: 'How does Bangladesh compare to other countries in blood donation?', a: 'Bangladesh has a voluntary donation rate of approximately **6-7 donations per 1,000 people** — below the WHO recommendation of **10-20 per 1,000**. In comparison: Japan (~70/1000), USA (~65/1000), UK (~40/1000), India (~10/1000), Nepal (~8/1000). There is significant room for growth in voluntary donation.' },
        { q: 'Which country has the highest blood donation rate?', a: '**Japan** and **Switzerland** lead the world with over **70 donations per 1,000 people** annually. High-income countries collectively account for **40% of global blood donations** despite having only 16% of the world\'s population. Low-income countries struggle to meet even 50% of their transfusion needs.' },
        { q: 'How many units of blood are needed worldwide each year?', a: 'The world needs approximately **120 million units of blood** each year. The WHO estimates that **42% of these are collected in high-income countries** (home to 16% of the population). To meet global demand, we need **30 million more voluntary donors** worldwide.' },
        { q: 'What is the WHO target for blood donation?', a: 'The **World Health Organization (WHO)** recommends that countries achieve **10-20 voluntary blood donations per 1,000 population** to meet their basic transfusion needs. Bangladesh is currently at about 6-7/1000. BloodBridge\'s mission is to help Bangladesh reach and exceed this target through technology and awareness.' },
        { q: 'Which blood type is the most common in the world?', a: '**Type O+** is the most common globally (36-40% of population). **Type A+** follows (28-30%). The distribution varies by region — Asia has higher B+ rates, while Europe has higher A+ rates. **AB-** is the rarest worldwide (<1%). Type O blood is most common in indigenous populations of Central and South America.' },
        { q: 'Does blood type distribution vary by region in Bangladesh?', a: '**Yes**, slight variations exist: **Dhaka division** has a slightly higher O+ percentage due to mixed populations. **Rural areas in northern Bangladesh** (Rangpur, Rajshahi) have marginally higher B+ rates. **Chittagong Hill Tracts** have a higher O+ and lower A+ rate. Overall, the national average is fairly consistent across districts.' },
        { q: 'What is the history of blood transfusion in Bangladesh?', a: 'Blood transfusion in Bangladesh began in the **1950s** at DMCH (Dhaka Medical College Hospital). The first blood bank was established at **DMCH in 1972** after independence. Sandhani was founded in **1977** by medical students. The **National Blood Transfusion Policy** was first formulated in 2010. BloodBridge launched in the 2020s to modernise the system with technology.' },
      ],
    },
    {
      category: 'Security, Privacy & Legal',
      icon: '\uD83D\uDEE1\uFE0F',
      items: [
        { q: 'How does BloodBridge protect my personal and medical data?', a: 'BloodBridge uses **bank-level encryption (AES-256)** for data storage and **TLS 1.3** for data transmission. Your health information is **anonymized** for analytics. We follow **Bangladesh\'s Data Protection Act** guidelines. Your data is never sold or shared with third parties without your explicit consent.' },
        { q: 'What personal information do I need to provide as a donor?', a: 'You need to provide: **full name**, **date of birth**, **blood type** (or we can test), **phone number**, **email address**, **current location** (or home address), **NID/passport number** (for verification), and **basic health information** (medications, medical history). This is standard for all blood banks in Bangladesh.' },
        { q: 'Can I remain anonymous as a donor?', a: '**Yes**, your identity is kept confidential. Recipients will only see: your blood type, general location (city/area), and donation history. Your name, phone, and address are revealed **only if you choose to share** them with a recipient after accepting a request. BloodBridge respects your privacy preferences.' },
        { q: 'What legal protection do blood donors have in Bangladesh?', a: 'Blood donors in Bangladesh are protected under the **Voluntary Blood Donation Guidelines** (DGHS). Donors cannot be penalized for donating. **Workplace leave for blood donation** is not yet mandated by law, but many organizations (including BloodBridge) encourage it. Some companies offer **1-2 hours of paid leave** for donation.' },
        { q: 'Can I get time off work to donate blood?', a: '**It depends on your employer.** In Bangladesh, there is no national law mandating paid leave for blood donation. However, many progressive companies and BloodBridge partner organizations offer **2-4 hours of paid leave** for donation. Check with your HR department. BloodBridge provides a **donation certificate** you can share with your employer.' },
        { q: 'What should I do if my account is compromised?', a: 'Immediately: 1) **Change your password** from the login page. 2) **Contact support** at support@bloodbridge.com. 3) **Review your recent activity** in your dashboard. 4) **Enable two-factor authentication** (2FA) for extra security. Our security team will investigate and protect your account. Never share your password with anyone.' },
        { q: 'Can I request my data be deleted from BloodBridge?', a: '**Yes**, you have the **right to be forgotten**. Go to **Profile Settings** → **Delete Account** or email privacy@bloodbridge.com. Your data will be permanently removed within **30 days** as per Bangladesh data protection law. Some anonymized donation statistics may be retained for public health reporting.' },
      ],
    },
    {
      category: 'BloodBridge Technical Features',
      icon: '\u2699\uFE0F',
      items: [
        { q: 'Does BloodBridge use artificial intelligence for donor matching?', a: '**Yes**, BloodBridge uses **AI-powered matching** that considers: blood type compatibility, distance and travel time, donor response history and reliability, real-time donor availability, donation interval eligibility, and urgency level. The AI learns from each request to improve future matches.' },
        { q: 'Can I integrate BloodBridge with my hospital\'s existing system?', a: '**Yes**, BloodBridge offers **REST API** and **HL7 FHIR** integration for hospitals and blood banks. Supported functions: real-time inventory sync, automated request placement, donor matching, status updates, and reporting. Our integration team provides **free onboarding support**. Contact **api@bloodbridge.com** for documentation and API keys.' },
        { q: 'What analytics does BloodBridge provide for blood banks?', a: 'BloodBridge dashboards provide: **real-time inventory levels** by blood type, **expiry tracking** with alerts, **donation trend analysis** (daily/weekly/monthly), **donor demographics**, **request response rates**, **wastage reports**, **cross-bank transfer** suggestions, and **demand forecasting** using historical data. All data is exportable as CSV or PDF.' },
        { q: 'Does BloodBridge support multiple languages?', a: '**Yes!** The BloodBridge platform currently supports **English** and **বাংলা (Bengali)** in the user interface. The AI chatbot (Raktosathi) understands both languages and can respond in either. We are working on adding more regional languages from India and Myanmar for the broader South Asian region.' },
        { q: 'Is BloodBridge accessible for users with disabilities?', a: '**We strive for inclusivity.** BloodBridge follows **WCAG 2.1 AA** accessibility standards: screen reader compatibility, keyboard navigation, high-contrast mode, resizable text, and descriptive alt text for images. The mobile PWA supports **voice input** on compatible browsers. We welcome feedback to improve accessibility at **accessibility@bloodbridge.com**.' },
        { q: 'What is the BloodBridge emergency hotline and how does it work?', a: 'Our **24/7 Emergency Hotline** is **08000-123-456**. When you call: an operator verifies your identity and request details, enters the request into the system, activates emergency donor notifications, and coordinates with nearby blood banks. The helpline also provides: first-aid guidance, nearest hospital directions, and status updates on your request.' },
      ],
    },
    {
      category: 'Disaster & Emergency Preparedness',
      icon: '\u26A1',
      items: [
        { q: 'How does BloodBridge prepare for natural disasters like cyclones or floods?', a: 'BloodBridge has a **Disaster Response Protocol**: pre-identified **shelter blood banks** in cyclone/flood-safe locations, **emergency donor lists** of volunteers who can donate during/after disasters, **mobile blood collection units** for inaccessible areas, **backup power and cold storage** at partner banks, and **SMS broadcast** to donors in affected zones before landfall.' },
        { q: 'Can I donate blood during cyclone season in Bangladesh?', a: '**Yes, but safety first.** During cyclones (April-May and October-November), blood banks remain operational in safe locations. If a **Red Alert** is issued, non-essential travel is discouraged — wait until the alert is lowered. BloodBridge sends notifications about which centres are open and accessible.' },
        { q: 'How does BloodBridge handle mass casualty events?', a: 'In a **mass casualty incident** (road accident, building collapse, factory fire): BloodBridge activates **emergency mode** — broadcasts urgent blood requests to all compatible donors in the area regardless of distance, coordinates with nearby hospitals for demand estimates, mobilizes **reserve donor lists**, and alerts partner blood banks to increase stock.' },
        { q: 'What should I do as a donor during a national emergency?', a: '1) **Register your availability** on BloodBridge (mark yourself as "available for emergency donation"). 2) Keep your **phone charged and on** for SMS alerts. 3) Stay near your **registered location** if possible. 4) Respond quickly if you receive an alert. 5) Follow safety instructions — do not put yourself in danger. 6) Eat and hydrate well to stay donation-ready.' },
        { q: 'Does Bangladesh have a national emergency blood reserve?', a: '**Yes**, the **Department of Transfusion Medicine** at BSMMU maintains a national reserve of blood units, especially O-negative and rare blood types. BloodBridge integrates with this reserve to provide real-time visibility of stock levels and facilitate distribution during crises.' },
      ],
    },
    {
      category: 'Senior & Young Donor Guide',
      icon: '\uD83E\uDDCD',
      items: [
        { q: 'Can people over 60 donate blood in Bangladesh?', a: '**Yes**, up to **65 years** of age. First-time donors over 60 may be accepted at the **blood bank physician\'s discretion** if they are in excellent health with no chronic conditions. Regular donors who started before 60 can continue until 65+ in some cases. Regular health monitoring is recommended for senior donors.' },
        { q: 'Are there special considerations for older donors?', a: '**Yes.** Senior donors should: ensure their **blood pressure is well-controlled**, have **no recent medication changes**, **not be frail or unsteady**, **eat and hydrate well** before donation, and **rest longer** (15-20 minutes) after donation. Many senior donors report that regular donation helps them stay healthy and active!' },
        { q: 'Can a person under 18 donate blood?', a: '**No**, the minimum age is **18 years** in Bangladesh, even with parental consent. This is regulated by DGHS for safety reasons. However, **16-17 year olds** can participate in awareness campaigns and volunteer at donation camps. They can also register on BloodBridge to be ready when they turn 18.' },
        { q: 'I am 18 and want to donate for the first time. Any tips?', a: '**Great decision!** Tips: 1) Eat a good meal 2-3 hours before. 2) Drink 500ml of water. 3) Bring your **NID** or passport. 4) Wear comfortable clothing with roll-up sleeves. 5) Inform staff it is your first time. 6) Do not watch the needle if you are nervous. 7) Relax and enjoy — you are saving lives! Afterward, enjoy the refreshments and feel proud.' },
        { q: 'Can a 65+ year old donate blood if they have been donating regularly?', a: '**Yes, many regular donors continue beyond 65** with their doctor\'s approval. Some blood banks accept donors up to **70 years** if they have a history of regular donation and are in good health. Annual health check-ups are recommended. BloodBridge tracks donor health metrics to enable safe senior participation.' },
        { q: 'Are there weight minimums for young donors?', a: '**Yes**, the minimum weight is **50kg** regardless of age. For younger donors (18-25) who are lighter or slender, ensuring adequate nutrition and hydration is extra important. If you weigh 45-49kg, check with the blood bank — some may accept at their discretion if you are otherwise healthy.' },
        { q: 'Can university students organize regular donation drives on campus?', a: '**Absolutely!** BloodBridge partners with universities to organize **semester-based donation drives**. We provide: registration setup, medical team coordination, awareness materials, and donor recognition. Students can earn **BloodBridge Campus Ambassador** certificates and compete in inter-university donation challenges. Contact **campus@bloodbridge.com** to start a chapter.' },
      ],
    },
    {
      category: 'Blood Donation & Common Illnesses',
      icon: '\uD83E\uDD12',
      items: [
        { q: 'Can I donate blood if I have dengue fever?', a: '**Yes, after full recovery.** Wait **6 months** after recovery from dengue fever, or **12 months** if you had dengue haemorrhagic fever. Dengue can affect platelet counts and bone marrow function. Ensure you are fully recovered with normal blood counts before donating. BloodBridge tracks post-dengue deferral dates.' },
        { q: 'Can I donate blood if I have typhoid?', a: '**Yes, after full recovery.** Wait **3 months** after completing treatment and being symptom-free. Typhoid is a bacterial infection that can temporarily affect the blood and bone marrow. Ensure your doctor has confirmed you are fully recovered.' },
        { q: 'Can I donate blood if I have malaria?', a: '**Yes, after full recovery.** Wait **1 year** after completing malaria treatment and being symptom-free. If you have visited a malaria-endemic area but did NOT get malaria, wait **6 months** after return. Malaria parasites can survive in blood for months, so this deferral ensures safety.' },
        { q: 'Can I donate blood if I have chickenpox or shingles?', a: '**Wait 2 weeks** after all lesions have completely healed and scabs have fallen off. For **shingles (herpes zoster)**, wait until all lesions are crusted over, plus an additional **2 weeks**. These are viral infections that can be transmitted through blood.' },
        { q: 'Can I donate blood if I have rheumatoid arthritis or lupus?', a: '**Autoimmune diseases** like rheumatoid arthritis, lupus (SLE), and multiple sclerosis generally require **individual assessment**. If the condition is mild, well-controlled, and you are not on immunosuppressive medications — you **may be accepted**. Severe cases or those on high-dose steroids are typically deferred.' },
        { q: 'Can I donate blood if I have had organ transplant?', a: '**Generally no.** Most organ transplant recipients are **permanently deferred** due to lifetime immunosuppressive medication and risk of transmitting infections. **Corneal transplants** and **bone grafts** may be accepted after 12 months depending on the type of graft.' },
        { q: 'Can I donate blood if I take antidepressants or anxiety medication?', a: '**Yes**, most antidepressants (SSRIs like fluoxetine, sertraline, citalopram), SNRIs, and anti-anxiety medications are **acceptable**. Ensure your condition is stable and you feel well on donation day. **Benzodiazepines** may cause drowsiness — check with the screening doctor. Never stop medication to donate.' },
      ],
    },
    {
      category: 'Travel & Blood Donation',
      icon: '\u2708\uFE0F',
      items: [
        { q: 'Can I donate blood after travelling to a malaria-endemic area?', a: 'If you have travelled to a **malaria-endemic area**, you must wait **6 months** after your return before donating blood (or **3 months** if you stayed less than 2 weeks and took prophylaxis). This applies to travel within Bangladesh (Chattogram Hill Tracts, Sundarbans) and international travel (Africa, Southeast Asia, South America).' },
        { q: 'Can I donate blood after international travel?', a: '**Yes**, but deferral periods vary by destination. **No waiting** for most developed countries (USA, UK, Europe, Japan, Australia). **6 months** for travel to malaria-endemic regions. **3 years (or permanent)** for vCJD-risk countries (UK 1980-1996, France 1980-2001). Check BloodBridge for the latest travel deferral guidelines.' },
        { q: 'Can I donate blood during air travel (as a passenger)?', a: '**No, blood cannot be donated on a commercial flight.** However, after flying, wait **24 hours** before donating to allow your body to adjust to ground-level pressure and hydration. Long-haul flights can cause dehydration and minor blood pressure changes.' },
        { q: 'Can I donate blood if I am a frequent traveller?', a: '**Yes**, but you need to track travel-related deferral periods. BloodBridge helps by: maintaining a **travel history log** in your profile, calculating deferral periods automatically, and notifying you when you become eligible after travel. Frequent travellers to low-risk countries face no restrictions.' },
        { q: 'Can I donate blood if I have lived abroad for many years?', a: '**Yes**, but there may be deferrals based on your country of residence. **UK (1980-1996, 3+ months)** — permanent vCJD deferral in many countries. **Malaria-endemic countries (6+ months)** — deferral periods vary. **Other countries** — generally no restrictions. Each blood bank follows its country\'s specific guidelines.' },
        { q: 'Can I donate blood after visiting a Zika-affected country?', a: 'If you have visited a **Zika virus-affected area**, most blood banks require a **28-day deferral** after return (since Zika can be transmitted through blood). If you have had **symptoms** (fever, rash, joint pain, red eyes), wait **120 days** after full recovery. Consult BloodBridge for current Zika travel restriction zones.' },
        { q: 'Can I donate blood if I am visiting Bangladesh as a tourist?', a: '**Yes**, tourists can donate blood in Bangladesh if they: meet the standard eligibility criteria (age 18-65, weight 50kg+, healthy), have been in Bangladesh for at least **72 hours** (for observation), have a valid passport, and are not from a country with vCJD restrictions. Donating in Bangladesh helps local patients!' },
      ],
    },
    {
      category: 'Dental & Medical Procedures',
      icon: '\uD83E\uDDB7',
      items: [
        { q: 'Can I donate blood after a tooth extraction?', a: '**Wait 1 week (7 days)** after a simple tooth extraction. For **surgical extractions** (impacted wisdom teeth, multiple extractions), wait **2 weeks**. The waiting period allows the mouth to heal and prevents bacteria from entering the bloodstream during the procedure.' },
        { q: 'Can I donate blood after a root canal?', a: '**Wait 2 weeks** after a root canal treatment. Root canals involve cleaning the tooth root and can introduce bacteria into the bloodstream. Wait until the infection has fully cleared and you are no longer taking antibiotics or pain medication.' },
        { q: 'Can I donate blood after a dental cleaning or check-up?', a: '**Yes**, routine dental check-ups, cleanings, and fillings have **no waiting period** if you feel well. If you were given antibiotics for the procedure, wait until you have completed the course and are symptom-free.' },
        { q: 'Can I donate blood after endoscopy or colonoscopy?', a: '**Wait 1 week** after a routine diagnostic endoscopy or colonoscopy with biopsy. **Wait 6 months** if a polyp was removed, or if there was significant bleeding during the procedure. Always inform the blood bank about recent medical procedures.' },
        { q: 'Can I donate blood after a minor surgery (biopsy, mole removal)?', a: '**Wait 1 week** for minor skin biopsies and mole removals with no complications. **Wait 4 weeks** for more involved biopsies (breast, lymph node, liver). The deferral ensures the surgical site is healed and there is no infection.' },
        { q: 'Can I donate blood after vaccination for travel?', a: '**It depends on the vaccine type:** Killed/inactivated vaccines (Hepatitis A, Typhoid injectable, Rabies, Cholera, Japanese Encephalitis) — **no waiting** if you feel well. **Live attenuated vaccines** (Yellow Fever, Oral Typhoid, Oral Cholera, BCG) — wait **2-4 weeks**. COVID-19, Flu, Tetanus — **no waiting**.' },
      ],
    },
    {
      category: 'Blood Donation & Lifestyle',
      icon: '\uD83C\uDFCB',
      items: [
        { q: 'How does sleep affect blood donation?', a: '**Get at least 6-8 hours of sleep** the night before donation. Poor sleep can lower blood pressure, increase dizziness risk, and affect your body\'s ability to recover. Well-rested donors have a smoother experience and lower chance of feeling faint.' },
        { q: 'Can I drink coffee or tea before donating blood?', a: '**Yes, in moderation.** 1-2 cups of coffee or tea are fine. However, **excessive caffeine** can raise blood pressure temporarily and act as a diuretic (dehydrating). After donation, avoid caffeine for 1-2 hours and prioritize water, juice, or electrolyte drinks instead.' },
        { q: 'Can I donate blood if I vape or use e-cigarettes?', a: '**Yes**, vaping does not prevent blood donation. However, avoid vaping for **2 hours before and after** donation. Nicotine can temporarily raise blood pressure and heart rate. Heavy vaping may affect lung function over time.' },
        { q: 'How does alcohol affect blood donation eligibility?', a: '**Avoid alcohol for 24 hours before donating.** Alcohol dehydrates you, dilates blood vessels, and can affect liver function tests. **After donation**, avoid alcohol for **24 hours** — your body needs fluids to replenish blood volume, and alcohol interferes with this process.' },
        { q: 'Can I work out or go to the gym after donating blood?', a: '**Avoid strenuous exercise for 24 hours** after donation. Your blood volume is reduced by about 8-10%, and your heart works harder to circulate blood. Light activities (walking, stretching, yoga) are fine. You can resume full workouts the **next day**.' },
        { q: 'Can I donate blood if I use recreational drugs?', a: '**Recreational drug use is a complex issue.** If you have used **intravenous (IV) drugs** at any time — **permanent deferral** (due to infection risk). **Non-IV drugs** (marijuana, hashish) may or may not be acceptable depending on local laws and blood bank policies. Always be honest with the screening staff — donor safety first.' },
        { q: 'Can I donate blood during intermittent fasting or time-restricted eating?', a: '**Not recommended.** Intermittent fasting means you may not have adequate nutrition or hydration, increasing the risk of fainting. If you are on an intermittent fasting schedule, **break your fast**, eat a balanced meal, drink water, wait 30-45 minutes, then donate. You can resume fasting after donation.' },
      ],
    },
    {
      category: 'COVID-19 & Blood Donation',
      icon: '\uD83E\uDDA0',
      items: [
        { q: 'Can I donate blood after recovering from COVID-19?', a: '**Yes**, wait **14 days** after your symptoms have fully resolved (or 14 days after a positive test if you were asymptomatic). If you were hospitalized or had severe COVID-19, wait **28 days** after full recovery. You can donate convalescent plasma if eligible.' },
        { q: 'Can I donate blood after a COVID-19 vaccine?', a: '**Yes, no waiting period** is required for all WHO-approved COVID-19 vaccines (Pfizer, Moderna, AstraZeneca, Sinopharm, Sinovac, etc.) if you feel well. There is no need to differentiate between vaccine types. Vaccine side effects (fever, fatigue) that last more than 24 hours may require waiting until they resolve.' },
        { q: 'Can COVID-19 be transmitted through blood transfusion?', a: '**There is no evidence** that COVID-19 (SARS-CoV-2) is transmitted through blood transfusion. The virus primarily spreads through respiratory droplets, not blood. However, as a precaution, many blood banks implemented symptom-based deferrals during the pandemic.' },
        { q: 'What is convalescent plasma therapy for COVID-19?', a: '**Convalescent plasma** contains antibodies from recovered COVID-19 patients. When transfused into current COVID-19 patients, these antibodies can help neutralize the virus. It was most effective when given **early** in the disease (within 3-7 days of symptoms). BloodBridge coordinated convalescent plasma donations during the pandemic surge.' },
        { q: 'Are there long-term effects of COVID-19 on blood donation eligibility?', a: 'Most recovered COVID-19 patients face **no long-term restrictions**. If you experienced lingering symptoms (**long COVID**) such as fatigue, lung damage, or heart inflammation, you may be temporarily deferred until full recovery. Each case is evaluated individually by the blood bank physician.' },
      ],
    },
    {
      category: 'Cosmetic Procedures & Skin',
      icon: '\uD83D\uDC84',
      items: [
        { q: 'Can I donate blood after getting Botox or fillers?', a: '**Wait 2 weeks** after Botox (botulinum toxin) injections. For **dermal fillers** (hyaluronic acid, Restylane, Juvederm), wait **1 week** if no complications. The concern is not the substance but the risk of infection at the injection site.' },
        { q: 'Can I donate blood after a hair transplant?', a: '**Wait 6 months** after a hair transplant procedure. Hair transplants involve surgical incisions and local anaesthesia, and you may be on antibiotics or anti-inflammatory medications. The deferral ensures complete healing.' },
        { q: 'Can I donate blood after laser hair removal or laser skin treatment?', a: '**No waiting period** for standard laser hair removal or non-invasive laser skin treatments if the skin is intact and there is no infection. For **ablative laser treatments** (CO2, Erbium) that remove skin layers, wait **2 weeks** until the skin is fully healed.' },
        { q: 'Can I donate blood after a tattoo or permanent makeup?', a: 'In Bangladesh, wait **6 months** after getting a tattoo, permanent makeup (eyebrows, lips, eyeliner), or microblading. This is due to the risk of blood-borne infections from non-sterile equipment. If performed with single-use sterile needles at a registered, licensed studio, some blood banks may reduce the wait to **3 months**.' },
        { q: 'Can I donate blood after a piercing (ear, nose, etc.)?', a: '**Wait 6 months** after any body piercing if done with non-sterile equipment. For piercings done with **single-use sterile needles** at a licensed professional studio, wait **1 month** (or until fully healed with no signs of infection). Always ensure the piercing site is completely healed before donating.' },
      ],
    },
    {
      category: 'For Blood Recipients (Patients & Families)',
      icon: '\uD83D\uDCAA',
      items: [
        { q: 'I need blood for my father who is admitted in DMCH. What should I do?', a: 'First, ask the attending doctor to write a **blood requisition slip** with blood group and units needed. Take it to the hospital\'s **blood bank counter** (usually ground floor). If the bank has stock, they will issue it after cross-matching (~30-60 min). If not, post a request on BloodBridge or contact **Sandhani** volunteers at the hospital. You can also ask family/friends to donate as replacement. Keep the patient\'s **bed number, hospital ID, and doctor\'s phone number** ready.' },
        { q: 'My baby needs a blood transfusion. Is it safe for newborns?', a: '**Yes, it is safe when done properly.** Newborn transfusions use very small volumes (15-20ml/kg) and are given slowly. The blood is specially **irradiated** to prevent graft-versus-host disease and **CMV-screened** for safety. In Bangladesh, newborns needing transfusion are common for: **jaundice** (exchange transfusion), **anaemia of prematurity**, and **sepsis**. The neonatologist will monitor throughout. Always use a licensed blood bank.' },
        { q: 'How many units of blood does a typical surgery need?', a: 'It varies widely: **Normal delivery** — usually 0 units. **C-section** — 0-1 unit (only if complications). **Hysterectomy** — 1-2 units. **Hip replacement** — 1-3 units. **Heart bypass (CABG)** — 2-5 units. **Liver transplant** — 5-20+ units. **Major trauma** — 5-50+ units. Ask your surgeon for an estimate before surgery so you can arrange donations in advance.' },
        { q: 'The hospital says they don\'t have my blood type. What are my options?', a: 'Don\'t panic. 1) Ask the blood bank to **check nearby partner banks** — BloodBridge shows live inventory. 2) Post an **emergency request** on BloodBridge — compatible donors will be alerted. 3) Ask your **family and friends** to donate (replacement donation). 4) Ask about **compatible alternatives** — O-negative can be given to anyone in emergencies. 5) Contact **Sandhani** or **Badhon** volunteers at the hospital.' },
        { q: 'Can I request blood for a patient in a different city?', a: '**Yes!** BloodBridge allows cross-city requests. The system searches for compatible donors and blood bank stock in the **patient\'s city** first, then expands radius if needed. You can place the request from anywhere — just enter the **patient\'s hospital name, city, and location**. Delivery partners can transport blood between nearby cities if needed.' },
        { q: 'What documents do I need to collect blood from a blood bank?', a: 'You typically need: 1) **Doctor\'s prescription/requisition slip** with blood group and units. 2) **Patient\'s hospital ID card** or admission form. 3) **Your own NID/passport** for identification. 4) **Replacement donor info** (if donating on behalf). 5) **Blood bag** (some banks provide, some require purchasing from pharmacy). Processing fee: **500-1500 BDT** typically.' },
        { q: 'The blood bank rejected my replacement donor. Why?', a: 'Common reasons: donor has **low haemoglobin** (<12.5 g/dL), **high/low BP**, **recent medication** (antibiotics, blood thinners), **recent illness or fever**, **underweight** (<50kg), or **age out of range** (<18 or >65). The donor can try again after resolving the issue. Meanwhile, ask **another family member or friend** to donate, or use BloodBridge to find voluntary donors.' },
        { q: 'I received a blood transfusion and now I have a fever. What should I do?', a: '**Inform the hospital staff immediately.** A fever after transfusion could be a: **Febrile non-haemolytic reaction** (most common — treatable with paracetamol), **Allergic reaction** (with itching/rash), or rarely a **haemolytic reaction** (serious). The nurse will stop or slow the transfusion, check your vitals, and give medication if needed. **Do not ignore it** — even mild symptoms should be reported.' },
        { q: 'How long after a transfusion can I go home?', a: 'For a **single unit**, you are usually monitored for **1-2 hours** after the transfusion completes. For **multiple units**, longer observation may be needed. The doctor will check your **vital signs, urine output, and any reaction symptoms** before discharge. Day-care transfusions (go home same day) are common for thalassaemia and chronic anaemia patients in Bangladesh.' },
        { q: 'Can a thalassaemia patient receive regular blood transfusions?', a: '**Yes**, regular transfusions are the **main treatment** for thalassaemia major. Patients typically need **1-2 units every 3-4 weeks** for life. In Bangladesh, the **Thalassaemia Foundation** and government hospitals provide subsidized transfusion programmes. Patients also need **chelation therapy** (to remove excess iron from repeated transfusions). BloodBridge can help schedule regular donors for thalassaemia patients.' },
        { q: 'My wife is having a C-section next week. How do I arrange blood in advance?', a: '**Smart planning!** 1) Ask the doctor how many units to arrange (typically 1-2 for C-section). 2) Find **2-4 compatible donors** among family/friends (in case some get deferred). 3) Have them pre-register at the hospital blood bank. 4) Keep their **phone numbers ready** for donation day. 5) Also post a **standby request** on BloodBridge. 6) Keep **5000-10000 BDT** aside for processing fees and emergencies.' },
        { q: 'The hospital says blood will be available tomorrow, but my patient needs it now. What can I do?', a: '**Escalate immediately.** 1) Talk to the **blood bank in-charge doctor** directly — explain the urgency. 2) Call **Sandhani** emergency line at **01714-000000** (DMCH). 3) Post an **emergency request** on BloodBridge with \'Critical\' tag. 4) Contact **nearby private blood banks** (Square, LabAid, Apollo) — they often have stock. 5) Call the **BloodBridge helpline 08000-123-456** for emergency coordination. Time is critical — do not wait.' },
      ],
    },
    {
      category: 'For Donors (Practical Guide)',
      icon: '\u2764\uFE0F',
      items: [
        { q: 'I registered on BloodBridge. Now what happens when someone needs my blood?', a: 'When a compatible request is posted near you, you will receive an **SMS and in-app notification** with: patient\'s blood group, units needed, hospital name and location, and urgency level. You can **Accept** or **Decline**. If you accept, the requester sees your contact info. Coordinate directly for donation. **Pro tip:** Keep your **availability status** updated and respond quickly — every minute matters in emergencies!' },
        { q: 'I accepted a request but the hospital is far. Can I donate at a closer blood bank?', a: '**It depends.** Some hospitals accept blood from any licensed blood bank (you donate locally, they arrange transport). Others require donation at their own bank for tracking. **Best practice:** Call the requester or hospital blood bank first to confirm. BloodBridge allows **cross-bank transfers** — the unit can be moved between BloodBridge partner banks within a city.' },
        { q: 'I want to donate regularly but I forget when I\'m eligible again. Does BloodBridge remind me?', a: '**Yes!** BloodBridge automatically tracks your **56-day eligibility interval** and sends you a **reminder SMS** when you are due. You can also see your **next eligible date** on your dashboard. Enable **donation reminders** in your notification settings — you can choose SMS, email, or both. You can also set a **monthly or quarterly goal** to stay motivated!' },
        { q: 'Can I donate blood if I have my period right now?', a: '**Yes, you can.** Menstruation does not prevent donation if you feel well and are not experiencing severe cramps or very heavy flow. Your iron may be slightly lower — drink extra water, eat iron-rich foods (spinach, dates, lentils), and rest if needed. Many women donate during their period without any issues.' },
        { q: 'I want to donate but I\'m scared of needles. Any advice?', a: 'You are **not alone** — many donors feel nervous! **Tips that work:** 1) **Look away** during the insertion. 2) Take **deep breaths** — inhale 4s, hold 4s, exhale 4s. 3) **Distract yourself** — talk to staff, listen to music, watch a video. 4) Bring a **friend** for support. 5) Remember the **pinch lasts 2-3 seconds** — then it\'s over. 6) The **first time is the hardest** — 90% of donors say it was easier than expected!' },
        { q: 'I donated blood but now I feel dizzy. Is this normal?', a: '**Yes, mild dizziness is normal** — it happens when your body adjusts to the reduced blood volume. **Do this:** Lie down with feet elevated, drink water or juice, eat a small snack, rest for 15-20 minutes. **Don\'t:** drive, operate machinery, or stand up suddenly. If dizziness persists beyond 30 minutes or you feel chest pain, seek medical help.' },
        { q: 'I\'m an O-negative donor. Why is my blood so important?', a: '**You are a superhero!** O-negative is the **universal donor** — your blood can be given to ANY patient, regardless of their blood type. This makes O-negative critically important for: **emergency trauma** (no time to type), **newborn emergencies**, **disaster situations**, and **unmatched patients**. Only about 7% of people are O-negative. BloodBridge gives **priority alerts** to O-negative donors for emergency situations.' },
        { q: 'Can I donate blood if I took paracetamol (Napa, Ace) yesterday?', a: '**Yes**, paracetamol (acetaminophen) is generally fine for blood donation if you took it for a minor issue (headache, mild pain) and you are **symptom-free today**. However, if you took it for a **fever, infection, or active illness**, wait until you are fully recovered (symptom-free for 7 days). Always tell the screening staff about any medications.' },
        { q: 'I donated blood 3 months ago. Can I donate again?', a: '**Yes!** The minimum interval in Bangladesh is **56 days (8 weeks)** between whole blood donations. Since you donated 3 months ago (~90 days), you are well past the waiting period. You can donate **up to 6 times per year** (men) or **4 times per year** (women). Check your BloodBridge dashboard for your exact next eligible date.' },
        { q: 'I have a cut on my finger from a kitchen knife. Can I still donate?', a: '**Yes**, a minor cut that is clean, healing well, and not infected is fine. Make sure the cut is **covered with a waterproof bandage** during donation. If the cut shows signs of infection (redness, swelling, pus, fever), wait until it is fully healed. Always inform the screening staff about any wounds.' },
        { q: 'What if I feel unwell after leaving the blood bank? Who can I call?', a: '**Call the blood bank where you donated** — their number is on your donor card. They are the most familiar with your case. You can also call **BloodBridge helpline 08000-123-456** for guidance. If you have **severe symptoms** (chest pain, difficulty breathing, heavy bleeding from site), **go to the nearest hospital emergency room** immediately and tell them you just donated blood.' },
        { q: 'I\'m a construction worker and my family depends on my daily wage. Can I afford to take the day off to donate?', a: 'BloodBridge understands this challenge. **Tips:** 1) Donate on a **Friday or weekend** (many blood banks open). 2) The **actual donation takes only 15-20 minutes** + 10 min rest = under 30 min total. 3) Some **employers give 2-4 hours paid leave** for donation — ask your supervisor. 4) BloodBridge provides a **donation certificate** you can show your employer. 5) **One donation saves 3 lives** — the time is worth it!' },
      ],
    },
    {
      category: 'For Doctors & Medical Staff',
      icon: '\uD83E\uDDD1\u200D\u2695\uFE0F',
      items: [
        { q: 'How do I place a blood request for my patient on BloodBridge?', a: 'Log into your **Doctor/Hospital Dashboard** → **Request Blood**. Enter: patient blood type (or order typing), units needed, urgency level (routine/urgent/emergency), diagnosis/ reason, and hospital location. You can also attach a **scanned requisition slip**. The system shows real-time availability at nearby blood banks and compatible donors. Confirm the request — donors and banks are notified instantly.' },
        { q: 'Can I prescribe blood transfusion through BloodBridge?', a: '**Yes**, BloodBridge supports **digital requisition**. You can enter the patient\'s details, blood group, units, and cross-match requirement. The system generates a **digital requisition number** that the blood bank references. This reduces paperwork and speeds up the process. All digital requisitions meet DGHS documentation standards for Bangladesh.' },
        { q: 'How do I check if a patient\'s family has arranged replacement donors?', a: 'Use the **Blood Request Tracker** on your dashboard. It shows: number of donors contacted, how many have accepted, their blood groups, expected donation times, and confirmation status. If replacement is insufficient, you can request **voluntary donors** through BloodBridge\'s matching system. The tracker updates in real time.' },
        { q: 'What should I do when a patient develops a transfusion reaction?', a: '**Stop the transfusion immediately.** Keep the IV line open with normal saline. Check vitals (BP, pulse, temp, SpO2). Compare pre- and post-transfusion vitals. Send **post-reaction blood samples** ( EDTA and plain) to the blood bank with the remaining blood unit. Document and report to the **hospital transfusion committee**. For severe reactions: give IV fluids, antihistamines, steroids, and call for ICU support if needed.' },
        { q: 'I need blood urgently for an accident victim in the middle of the night. What\'s the fastest way?', a: '**Call BloodBridge helpline 08000-123-456** immediately. While calling: 1) Activate the **Emergency Request** on your dashboard with \'Critical\' tag. 2) Use **O-negative** if the patient\'s blood type is unknown. 3) Contact the **hospital\'s emergency blood bank** (they often keep O-negative for such cases). 4) BloodBridge will broadcast to all compatible donors within **5km radius** and alert **24-hour blood banks** nearby. The system is designed for rapid response.' },
        { q: 'How do I track a patient\'s transfusion history on BloodBridge?', a: 'Go to the **Patient Profile** (search by hospital ID or phone) → **Transfusion History** tab. You can see: date of each transfusion, blood group and units given, pre- and post-transfusion vitals, any reaction notes, and the issuing blood bank. This is especially useful for **thalassaemia, haemodialysis, and cancer patients** who need regular transfusions.' },
        { q: 'Can I request blood for a patient using their NID number?', a: '**Yes**, you can search for a patient by their **NID number** in the BloodBridge system (if they are registered). This pulls up their blood type (if verified), transfusion history, any known antibodies, and previous reaction records. This is especially useful in **emergencies** when the patient is unconscious and family is not reachable.' },
        { q: 'What is the proper way to fill a blood requisition form?', a: 'A proper requisition must include: **Patient\'s full name, age/DOB, hospital ID, ward/bed number**. **Clinical diagnosis** and reason for transfusion. **Blood group** (A, B, AB, O with Rh). **Number of units**. **Type of component** (whole blood, PCV, FFP, platelets, cryo). **Urgency** (routine within 24h, urgent within 4h, emergency within 1h). **Attending doctor\'s name, signature, and registration number**. Incomplete forms cause delays.' },
        { q: 'How do I order blood components instead of whole blood?', a: 'On the BloodBridge request form, select **Component Type**: Packed RBC (for anaemia), Platelets (for low count, dengue), FFP (for clotting factor deficiency, liver disease), Cryoprecipitate (for fibrinogen deficiency), or Whole Blood (for massive haemorrhage). Most blood banks in Bangladesh can provide component separation. Using the right component conserves blood and helps more patients.' },
        { q: 'My hospital is not yet on BloodBridge. How do I register?', a: '**Easy!** Go to **bloodbridge.com/hospital-register** or call **08000-123-456**. Provide: hospital name, registration/license number, address, blood bank in-charge details, and number of beds. Verification takes **24-48 hours**. After approval, your team gets dashboard access, inventory management tools, and donor matching. Onboarding support is **free**.' },
      ],
    },
    {
      category: 'For Lab Technicians',
      icon: '\uD83D\uDD2C',
      items: [
        { q: 'How do I record blood group test results on BloodBridge?', a: 'Log into the **Lab Dashboard** → **Blood Typing**. Enter patient/donor ID. Record: **ABO group** (A/B/AB/O) and **Rh type** (+/-). You can upload a **scanned report** or photo of the gel card/tube result. The system flags any **discrepancies** if the result differs from previous records. All results are digitally signed for traceability. Always double-check with a second method for confirmation.' },
        { q: 'What tests are mandatory before issuing blood for transfusion?', a: 'According to **DGHS Bangladesh** guidelines, every blood unit must be tested for: **HIV** (anti-HIV 1&2), **HBsAg** (Hepatitis B), **Anti-HCV** (Hepatitis C), **VDRL/RPR** (Syphilis), and **MP** (Malaria parasite). Additionally: **ABO/Rh grouping**, **cross-matching** with recipient plasma, and **antibody screening** for regular transfusion patients. All results must be recorded before issue.' },
        { q: 'How do I perform cross-matching on BloodBridge?', a: 'BloodBridge has a **Cross-matching Module**: Enter the **donor unit ID** (scan barcode) and **recipient ID**. The system checks ABO/Rh compatibility automatically. Record the **cross-match result**: Compatible (no agglutination/lysis) or Incompatible. For incompatible results, the system suggests **alternative compatible units** in inventory. Attach a **photo of the cross-match tube/gel card** for documentation.' },
        { q: 'What should I do if a blood unit tests positive for a disease marker?', a: '**Follow the discard protocol.** 1) Mark the unit as **REACTIVE** in BloodBridge — it is automatically locked from issue. 2) Follow the **biohazard disposal** protocol: autoclave at 121°C for 30 min or incinerate. 3) **Counsel the donor** confidentially — refer them to the nearest hospital for confirmatory testing and medical advice. 4) Document the discard in the **rejection log** with reason and lot number of test kit used.' },
        { q: 'How do I manage blood component inventory on BloodBridge?', a: 'Use the **Inventory Dashboard**: Add new units by scanning the **bag barcode** or entering the unit ID. Record: blood group, component type, collection date, expiry date, and donor ID. The system automatically calculates **remaining shelf life**, sends **expiry alerts** (7 days, 3 days, 24 hours before expiry), and suggests **transfer** to other banks if stock is surplus.' },
        { q: 'A donor\'s blood group result is different from what they told us. What should I do?', a: '**Repeat the test** with a fresh sample using a different method (tube vs gel card). If the discrepancy persists: 1) Record the **correct result** in BloodBridge as the verified group. 2) Update the donor\'s profile with a note about the discrepancy. 3) **Counsel the donor** — they may have been misinformed. 4) Issue a **blood group card** with the correct result. This is common — many people are told wrong blood types informally.' },
        { q: 'When do I need to perform an antibody screening test?', a: 'Antibody screening is required for: **All pregnant women** (first visit and at 28 weeks — Rh antibodies are critical), **Patients with history of transfusion reactions**, **Patients who have had multiple transfusions** (thalassaemia, haemodialysis), **Patients with a positive direct Coombs test**, **Donors with a history of transfusion or pregnancy**. BloodBridge flags these cases automatically.' },
        { q: 'How do I record wastage of expired blood units?', a: 'In the **Inventory Dashboard** → **Manage Wastage**. Select the expired unit(s) — the system auto-fills expiry details. Record: **disposal method** (autoclave/incinerate/chemical treatment), **witness name** (second technician), **date and time**. The wastage is logged for **monthly reporting** to DGHS. BloodBridge\'s **near-expiry alerts** help reduce wastage significantly.' },
        { q: 'Can BloodBridge help with blood group discrepancies between two labs?', a: '**Yes.** BloodBridge maintains a **donor\'s verified blood group history**. If a new test result conflicts with the verified history, the system **flags the discrepancy** and recommends: re-testing with a different method (tube + gel card), checking for weak subgroups (A2, A2B, Bombay phenotype), and consulting with the blood bank in-charge. This prevents incompatible transfusions.' },
        { q: 'What temperature logs do I need to maintain for blood storage?', a: 'BloodBridge helps you maintain digital **temperature logs**. Record: **Refrigerator temperature** (target 2-6°C, record min/max every 4 hours), **Platelet agitator temperature** (20-24°C), **Freezer temperature** (≤-18°C for plasma, ≤-30°C for cryo), and **Room temperature** for testing area. The system alerts you if temperature goes out of range. Logs must be kept for **5 years** as per DGHS guidelines.' },
      ],
    },
    {
      category: 'For Delivery Staff',
      icon: '\uD83D\uDEF4',
      items: [
        { q: 'I got a blood delivery request on BloodBridge. What do I do next?', a: '**Step 1:** Accept the request within **2 minutes** or it auto-reassigns. **Step 2:** Call the **blood bank** to confirm the unit is ready. **Step 3:** Check your **cold box** — ensure it is pre-cooled and has enough ice packs. **Step 4:** Go to the blood bank, verify the blood bag label matches the request (blood group, unit ID, expiry), sign the **issue register**, and place the bag in the cold box. **Step 5:** Deliver to the hospital\'s blood bank counter and get a **delivery acknowledgement signature**.' },
        { q: 'How do I maintain the cold chain during delivery?', a: '**Critical rules:** 1) The cold box must be **pre-cooled** (place ice packs 30 min before use). 2) Temperature inside must stay **2-6°C** for RBCs. 3) **Do not open the box** during transit unless necessary. 4) Limit **time out of refrigeration** to **30 minutes max**. 5) Use a **temperature indicator** or logger inside the box. 6) If delayed >30 min, the blood may be compromised — contact the blood bank for instructions.' },
        { q: 'What if I get stuck in traffic with blood in my delivery box?', a: 'Dhaka traffic is challenging! **Tips:** 1) Always plan a **30-minute buffer** for traffic. 2) Use a **temperature-monitored box** that alerts if temp exceeds 6°C. 3) If stuck >20 min beyond expected delivery, **call the BloodBridge dispatcher** (number in your app) for guidance. 4) If the **indicator shows temperature breach**, notify the blood bank immediately — do NOT deliver compromised blood. 5) Stay calm — the blood is well-protected in a proper cold box for 2-3 hours.' },
        { q: 'How do I handle the blood bag safely?', a: '**Always:** Wash hands before handling. Inspect the bag for **leaks, clots, discolouration, or damage**. Never use a bag with expired date. Carry the bag **upright** (not upside down). **Never squeeze or press** the bag. Keep away from direct sunlight and heat. **Never refrigerate again** after a unit leaves controlled storage — it must be used within 30 min of return to storage. Report any damage immediately.' },
        { q: 'What documents do I need for blood delivery?', a: 'Carry: 1) **Delivery challan** (from BloodBridge app — digital or printed). 2) **Blood bag label** (attached to the unit). 3) **Cross-match report** (if already done). 4) **Your ID card** (BloodBridge delivery staff ID + NID). 5) **Temperature log** for the transport box. At the hospital, the receiving technician will sign the challan and record the bag serial number. Keep a **signed copy** for your records.' },
        { q: 'Can I deliver blood to multiple hospitals in one trip?', a: '**Only if you have a validated multi-compartment cold box** that keeps each unit segregated and temperature-controlled. Each unit must have its own **temperature monitoring**. Otherwise, do **one delivery per trip** to avoid mix-ups and maintain cold chain integrity. BloodBridge optimises routes and alerts you if multiple pickups or drops are in the same area.' },
        { q: 'I dropped the cold box! What should I do?', a: '**Do NOT deliver the blood.** 1) Check the bag for **visible damage, leaks, or clots**. 2) Even if no visible damage, **internal haemolysis** may have occurred — the unit may be unsafe for transfusion. 3) **Return the unit to the blood bank** immediately for inspection. 4) Note the incident in the BloodBridge delivery log. 5) Blood bank will decide if the unit can be re-issued or must be discarded. Safety first — never take a chance.' },
        { q: 'What if the hospital refuses to accept the blood?', a: '**Stay calm and ask for the reason.** Common reasons: wrong blood group, damaged bag, expired unit, incomplete paperwork, or the patient was already discharged/transfused. **Solution:** Call the BloodBridge dispatcher immediately. If there is a genuine error, the dispatcher will coordinate with the blood bank and find an alternative. **Never abandon the blood** — return it to the issuing blood bank with a note about the refusal.' },
      ],
    },
    {
      category: 'For Blood Bank Managers & Staff',
      icon: '\uD83C\uDFE5',
      items: [
        { q: 'How do I add my blood bank to BloodBridge\'s network?', a: 'Contact **partners@bloodbridge.com** or call **08000-123-456**. Our team will: verify your **DGHS license** and blood bank registration, set up your **Blood Bank Dashboard** with inventory management, train your staff (usually 1-2 hours online), integrate your existing system (if any) via API, and activate your profile on the platform. Onboarding takes **2-5 business days** and is **free for licensed blood banks**.' },
        { q: 'How do I update my blood bank\'s real-time inventory on BloodBridge?', a: 'Use the **Inventory Dashboard**: Scan the barcode on each new blood bag, or enter: **blood group, component type, collection date, expiry date, donor ID, and test results**. The system updates live. You can also enable **auto-sync** with your existing inventory software via BloodBridge API. Inventory is visible to partner hospitals and the public (anonymized stock levels) to help them find blood faster.' },
        { q: 'How does BloodBridge help reduce blood wastage at my bank?', a: 'BloodBridge tackles wastage four ways: 1) **Near-expiry alerts** — SMS/email notifications when blood is within 7, 3, and 1 day of expiry. 2) **Redistribution suggestions** — when nearby banks have low stock of a blood type you\'re about to expire, the system suggests transfer. 3) **Demand forecasting** — predicts which blood types you will need based on historical usage patterns. 4) **Donor scheduling** — matches donation appointments to actual demand, preventing over-collection.' },
        { q: 'What reports does BloodBridge generate for my blood bank?', a: 'BloodBridge generates: **Daily/Weekly/Monthly collection reports** by blood type. **Issue reports** — blood issued to which hospital/patient. **Wastage reports** — expired or discarded units with reasons. **Donor demographics** — age, gender, blood group distribution. **Reactive rate** — percentage of donations testing positive for diseases. **Cross-match to transfusion ratio**. All reports are **DGHS-compliant** and can be exported as PDF or Excel.' },
        { q: 'How do I handle a reactive (positive) donor on BloodBridge?', a: 'When a donor screens positive for any disease marker: 1) Mark the unit as **Reactive** in the system. 2) The system **auto-locks** the unit from issue. 3) Enter the **confirmatory test results** (if performed). 4) The **donor\'s profile is flagged** for confidential counselling. 5) Schedule a **counselling session** — explain the result, advise on follow-up testing, and refer to a specialist if needed. 6) Record the counselling outcome in the system. Donor confidentiality is **mandatory**.' },
        { q: 'Can my blood bank accept replacement donors through BloodBridge?', a: '**Yes!** When a hospital places a request, BloodBridge can **coordinate replacement donors**. The system tracks: how many replacement donors the patient\'s family has arranged, their blood groups, and donation status. Family members can pre-register on BloodBridge, get their eligibility checked, and donate at your bank. This streamlines the traditional replacement process and reduces paperwork.' },
        { q: 'What are the DGHS reporting requirements and how does BloodBridge help?', a: 'Blood banks in Bangladesh must submit **monthly reports** to DGHS including: number of donations (voluntary vs. replacement), collection by blood type, units issued, units expired/wasted, reactive cases by disease, and donor demographics. BloodBridge **auto-generates these reports** from your data — just click **Export → DGHS Format**. This saves hours of manual reporting work.' },
        { q: 'How does the cold chain monitoring work on BloodBridge?', a: 'BloodBridge supports **IoT temperature monitoring** for blood bank refrigerators (partner devices). You get **real-time temperature readings** on your dashboard, **SMS alerts** if temperature goes out of range (2-6°C), **24-hour temperature graphs**, and **audit trail** for regulatory compliance. Even without IoT sensors, you can manually log temperature readings, and the system will track trends and flag concerns.' },
        { q: 'How do I manage donor deferrals in the system?', a: 'When a donor is deferred, enter the **deferral reason**, **duration** (temporary/permanent), and **next eligible date** (for temporary). BloodBridge: auto-calculates when the deferral expires, notifies the donor when they become eligible, prevents them from donating while deferred, tracks deferral patterns (e.g., frequent low haemoglobin may indicate need for iron supplementation), and generates **deferral statistics** for your monthly reports.' },
        { q: 'Can I set up automated SMS notifications for my blood bank?', a: '**Yes!** Your Blood Bank Dashboard has an **Automation Settings** panel. You can set up: **Low stock alerts** — SMS to manager when any blood type falls below threshold. **Expiry alerts** — daily SMS with list of near-expiry units. **Donation day reminders** — SMS to scheduled donors 24 hours before. **Emergency alerts** — broadcast to registered donors when you have urgent need. Each notification can be customised with your blood bank\'s name and contact.' },
      ],
    },
    {
      category: 'For Hospital Administrators',
      icon: '\uD83C\uDFE0',
      items: [
        { q: 'How do I integrate my hospital with BloodBridge?', a: 'Email **partners@bloodbridge.com** with your hospital name and license number. Our team will: set up your **Hospital Dashboard**, connect you with nearby partner blood banks, train your staff on the request system, optionally integrate with your **HIS (Hospital Information System)** via API, and provide 24/7 support. Most hospitals are onboarded within **3-5 business days**. The basic integration is **free** — premium features (API, analytics) have tiered pricing.' },
        { q: 'How does BloodBridge help reduce blood request processing time?', a: 'BloodBridge **cuts processing time by 60-70%**. Instead of manual phone calls to multiple blood banks, your staff places **one digital request**. The system: checks all nearby partner banks\' live inventory instantly, alerts compatible donors automatically, tracks acceptance and delivery in real time, and provides **one dashboard** to manage all requests. Average time from request to blood arrival: **30-45 minutes** vs **2-4 hours** traditional.' },
        { q: 'Can BloodBridge integrate with our existing Hospital Information System?', a: '**Yes**, BloodBridge offers **REST API** and **HL7 FHIR** integration. Supported: patient registration sync, blood requisition auto-population, lab results integration, inventory synchronisation, billing data exchange, and discharge summary inclusion. Our integration team provides **free technical support** for setup. API documentation is available at **api.bloodbridge.com/docs**. Contact **api@bloodbridge.com** for a free integration consultation.' },
        { q: 'How do I track blood usage patterns in my hospital?', a: 'The **Hospital Dashboard** provides analytics: **Monthly blood usage** by department (Surgery, Medicine, Gynae, Paediatrics, Emergency), **Blood type consumption patterns**, **Peak usage times** (which hours/days see highest demand), **Cross-match to transfusion (C:T) ratio** — a key quality indicator (target <2:1), **Wastage analysis** — units ordered but not used, and **Cost analysis** — processing fees by month. These help optimise your blood ordering and reduce wastage.' },
        { q: 'What is the process for emergency blood requests in a hospital setting?', a: '**Emergency protocol:** 1) Doctor places **Emergency Request** via BloodBridge (or calls helpline). 2) System broadcasts to all compatible donors within **5km**. 3) Parallel request sent to all **nearby partner blood banks** for immediate availability check. 4) Hospital\'s own **emergency blood reserve** (minimum 2 units O-negative) is checked. 5) Donor/bank with fastest ETA gets priority. 6) Delivery tracked live until arrival. **Target: blood at bedside within 30 minutes for critical cases.**' },
        { q: 'How do I manage blood requisition approvals digitally?', a: 'BloodBridge\'s **Approval Workflow**: A doctor creates a digital requisition → it goes to the **department head** for approval (if >2 units) → then to the **blood bank in-charge** for cross-match → then to the **issuing technician**. Each step is tracked with timestamps. Approvals can be done **from any device** — including mobile. This creates a complete **audit trail** for every unit of blood used in your hospital.' },
        { q: 'Can I see which doctors or departments request the most blood?', a: '**Yes!** The **Hospital Analytics Dashboard** breaks down: requests by **doctor name** (sorted by volume), by **department** (Surgery vs Medicine vs Emergency), by **diagnosis** (thalassaemia, dengue, surgery, trauma), and by **outcome** (transfused vs cancelled). This helps identify training needs (e.g., over-ordering), allocate resources better, and track quality improvement initiatives.' },
        { q: 'What are the standard blood ordering schedules for planned surgeries?', a: '**Best practices in Bangladesh:** For **elective surgeries**, order blood **24-48 hours in advance**. Standard orders: **C-section** — cross-match 1 unit (have 2 donors on standby). **Hysterectomy** — cross-match 2 units. **Cholecystectomy** — group & screen (G&S) only, no cross-match needed unless complications. **Orthopaedic surgeries** (hip/knee replacement) — cross-match 2 units. **Open heart surgery** — cross-match 4-6 units.' },
        { q: 'How do I handle a patient who refuses blood transfusion (e.g., Jehovah\'s Witness)?', a: '**Document everything.** 1) Have the patient sign an **informed refusal form** (available on BloodBridge). 2) Explore **alternatives**: iron therapy, EPO (erythropoietin), cell salvage during surgery, volume expanders, tranexamic acid to reduce bleeding. 3) Involve the **hospital ethics committee** if needed. 4) For **minors**, courts may override parental refusal in life-threatening situations. 5) Mark the patient\'s chart **clearly** — \'No Blood Products\' — in both paper and BloodBridge digital records.' },
        { q: 'How does BloodBridge help with regulatory compliance in Bangladesh?', a: 'BloodBridge ensures your hospital meets **DGHS requirements** through: **Digital audit trail** for every blood unit from donation to transfusion, **Auto-generated monthly reports** in DGHS format, **Temperature monitoring logs** with permanent records, **Reaction reporting** module for transfusion incidents, **Donor deferral tracking**, and **Staff training records** for blood bank personnel. All data is stored securely for **5+ years** as required by law.' },
      ],
    },
    {
      category: 'For Medical Colleges & Students',
      icon: '\uD83C\uDF93',
      items: [
        { q: 'How can our medical college partner with BloodBridge?', a: 'Medical colleges can partner with BloodBridge to: host **regular blood donation camps** on campus (we provide equipment, staff, and awareness materials), give students **hands-on training** in blood bank operations through our dashboard, participate in **inter-medical college donation competitions**, integrate **BloodBridge case studies** into your curriculum (Community Medicine and Transfusion Medicine), and provide your students **BloodBridge Campus Ambassador certificates**. Contact **campus@bloodbridge.com**.' },
        { q: 'Can MBBS students volunteer at blood banks through BloodBridge?', a: '**Yes!** MBBS students can register as **BloodBridge Medical Volunteers**. Roles include: assisting at donation camps (taking histories, checking vitals), helping with donor awareness sessions, learning blood grouping and screening under supervision, assisting in camp organisation, and participating in **community blood donation drives** in nearby villages. Students receive **certified volunteer hours** and recommendation letters for their CV.' },
        { q: 'How can medical students learn about blood transfusion medicine?', a: 'BloodBridge provides: **free access to the Blood Bank Dashboard** (view-only mode for students — see inventory, request processing, cross-matching workflow), **case-based learning modules** on transfusion reactions and donor management, **virtual internship programmes** (4-week program covering blood bank operations), **webinars** with senior transfusion medicine specialists, and **MCQ tests** with certificates. Contact **education@bloodbridge.com** for institutional access.' },
        { q: 'Can our medical college organize a blood group screening camp for students?', a: '**Absolutely!** BloodBridge helps you organize **blood group screening camps** for new MBBS admits and existing students. We provide: ABO/Rh typing kits, trained phlebotomists (or train your students), digital record-keeping (results directly entered into BloodBridge — students get a digital blood group card), and reporting. This is an excellent **Community Medicine practical** and also builds your college\'s pool of registered blood donors.' },
        { q: 'How does the Sandhani-Bridge partnership work for medical colleges?', a: '**Sandhani branches** at medical colleges can integrate with BloodBridge\'s platform. This means: Sandhani\'s donor database syncs with BloodBridge for emergency matching, camp scheduling and donor mobilisation can be done through the platform, and **inter-college coordination** for blood transfers during shortages. Students managing Sandhani get **dashboard access** to track their college\'s donation statistics and compare with other colleges.' },
        { q: 'Can medical college students do their research projects using BloodBridge data?', a: '**Yes!** BloodBridge provides **anonymized aggregate data** for research. Available: blood group distribution trends, donation patterns by age/gender/region, seasonal variations in demand (dengue season spikes platelet demand), wastage rate analysis, and deferral reason statistics. Students can use this for **research papers, posters, and theses**. Approval required via **research@bloodbridge.com** with your college ethics board clearance.' },
        { q: 'How can we start a BloodBridge campus club at our medical college?', a: '**Easy!** 1) Gather **10+ interested students**. 2) Find a **faculty advisor** (preferably from Transfusion Medicine or Community Medicine). 3) Register your club at **bloodbridge.com/campus-club**. 4) BloodBridge provides: **starter kit** (posters, banners, awareness materials), **training session** for club members (online workshop), **quarterly activities guide**, and **certificates** for active members. Clubs compete in **national rankings** based on donations organised!' },
        { q: 'What careers are available in transfusion medicine in Bangladesh?', a: 'There is a **growing demand** for transfusion medicine specialists. Careers include: **Blood Bank Officer** (government and private hospitals — FCPS/MD in Transfusion Medicine required), **Transfusion Medicine Consultant**, **Lab Technician specialising in blood banking**, **Donor Recruitment Coordinator**, **Quality Assurance Officer** for blood banks, **Research Associate** in transfusion science, and **Hospital Transfusion Committee Coordinator**. BloodBridge offers **internships** and **placement support** for qualified graduates.' },
        { q: 'Can nursing students and lab technology students also benefit?', a: '**Absolutely!** Nursing students can learn: transfusion administration, patient monitoring during transfusion, recognition and reporting of transfusion reactions, and blood sample collection for cross-matching. **Lab technology students** can learn: blood grouping techniques, disease screening (ELISA, NAT), component preparation, cross-matching, and quality control. BloodBridge provides **role-specific training modules** for both groups.' },
        { q: 'How can our medical college help during blood shortages in our district?', a: 'Medical colleges can be **lifesavers** during shortages: 1) Activate your **campus donor network** through BloodBridge — send emergency SMS to all student and staff donors. 2) Open your college blood bank to **public donations** (if licensed). 3) Organise **emergency donation camps** on campus with extended hours. 4) Coordinate with **nearby district hospitals** through BloodBridge\'s cross-bank transfer system. BloodBridge prioritises medical colleges in its **disaster response network**.' },
      ],
    },
    {
      category: 'For System Administrators & Managers',
      icon: '\uD83D\uDD27',
      items: [
        { q: 'How do I add new users to our BloodBridge organisation?', a: 'As an **Admin**, go to **User Management** → **Add User**. Enter: name, email, phone, role (doctor/nurse/lab tech/delivery/reception/admin), department, and access level (view-only/editor/approver/admin). The new user receives an **invitation email/SMS** with a temporary password. You can also **bulk-import** users via CSV. **Security best practice:** Enable **two-factor authentication** for all admin accounts.' },
        { q: 'How do I set up roles and permissions for my team?', a: 'BloodBridge has **pre-defined roles** with appropriate permissions: **Super Admin** — full access, **Blood Bank Manager** — inventory, donors, reports, **Lab Technician** — testing, cross-matching, **Doctor** — requests, patient history, **Nurse** — transfusion administration, recording, **Reception** — donor registration, scheduling, **Delivery Staff** — delivery management only, **Viewer** — read-only for auditors/inspectors. You can **custom permissions** for each role in **Settings → Access Control**.' },
        { q: 'How does BloodBridge handle data backup and disaster recovery?', a: 'BloodBridge uses **automated daily backups** to **redundant cloud servers** (geographically distributed). Our **Recovery Time Objective (RTO)** is <4 hours, and **Recovery Point Objective (RPO)** is <24 hours. **On-premise hospitals:** we can set up local backup servers. **During internet outages**, the mobile app queues requests and syncs when online. Your data is **encrypted at rest (AES-256)** and **in transit (TLS 1.3)**. We also support **offline-capable deployment** for critical hospital blood banks.' },
        { q: 'How can I generate custom reports for management?', a: 'The **Reports Dashboard** allows custom reports: Select date range, department, blood type, or any combination. Filter by: donor demographics, request outcomes, wastage reasons, or staff performance. Export as: **PDF** (for management presentations), **Excel** (for further analysis), **CSV** (for database import). You can also **schedule automatic reports** (daily/weekly/monthly) sent to your email. Create **dashboard widgets** for KPIs your management cares about.' },
        { q: 'How do I handle a data breach or security incident?', a: 'BloodBridge has an **Incident Response Protocol**: 1) **Immediately** lock the affected account(s) from Admin Dashboard. 2) Call our **24/7 Security Hotline** (provided in your Admin Kit). 3) Our security team will: investigate, contain the breach, assess data exposure, notify affected users if required (within 72 hours per data protection law), and implement fixes. 4) Provide a **detailed incident report** for your records. 5) **Regular security audits** prevent most incidents.' },
        { q: 'Can I customise the BloodBridge platform for our hospital\'s branding?', a: '**Yes!** Organisational accounts can customise: **Dashboard logo** and **colour scheme** (upload your hospital logo and choose brand colours), **SMS templates** (customise notification language and branding), **Email templates** (add your hospital header/footer), **Print formats** (requisition forms, labels, reports with your logo), and **Portal URL** (yourhospital.bloodbridge.com). Contact **support@bloodbridge.com** to enable branding customisation.' },
        { q: 'How do I manage multiple branches or departments of my hospital?', a: 'BloodBridge supports **multi-branch management**: Each branch gets its own **sub-dashboard** (Blood Bank, Inventory, Requests, Reports). Admin can **view consolidated data** across branches or drill down into each. Inventory can be **transferred between branches** through the system. **Centralised admin** controls user access across branches. This is ideal for hospital chains like **Square, LabAid, United, or Apollo** with multiple locations.' },
        { q: 'What training does BloodBridge provide for new staff?', a: 'BloodBridge provides: **Online training videos** (role-specific, 15-30 min each), **Live webinar training** (scheduled weekly — your staff can join live), **User manuals and quick reference guides** (downloadable PDF), **Test/sandbox environment** where staff can practice without affecting live data, **On-site training** (for enterprise plans — our trainer visits your hospital), and **Certification** for completing training modules. New staff should complete training before accessing the live system.' },
      ],
    },
    {
      category: 'Blood Donation & Mental Health',
      icon: '\uD83E\uDDD8\u200D\u2642\uFE0F',
      items: [
        { q: 'I feel very anxious before donating blood. Is this normal?', a: '**Yes, very common!** About **1 in 5 new donors** experiences some anxiety. It is called **blood-injury phobia** or needle anxiety and it is a natural response. **Try:** deep breathing (4-4-4 method), telling the staff (they will distract you), listening to calming music, bringing a friend, or looking away during the needle. **90% of anxious donors** say it gets easier each time. You are brave for donating despite the fear!' },
        { q: 'Can blood donation help with my stress or depression?', a: '**Many donors report feeling better after donating.** The act of helping others releases **endorphins** and **oxytocin** (the \'helper\'s high\'). It gives a sense of purpose and community connection. However, blood donation is **not a treatment** for clinical depression or anxiety disorders. If you are struggling with your mental health, please consult a mental health professional. Blood donation can be a **positive addition** to your wellness routine, not a replacement for medical care.' },
        { q: 'My child needs regular transfusions. I feel helpless and exhausted. What support is available?', a: '**You are not alone.** Caring for a transfusion-dependent child (thalassaemia, sickle cell, cancer) is emotionally and physically draining. **Support available:** **Thalassaemia Foundation of Bangladesh** — counselling and parent support groups. **BloodBridge** — helps coordinate regular donors so you worry less about blood availability. **Online communities** — Facebook groups for thalassaemia parents in Bangladesh. **Hospital social workers** — many government hospitals have counselling services. Reach out — you deserve support too.' },
        { q: 'I feel guilty that I needed a blood transfusion and someone had to donate for me. Is that normal?', a: '**Yes, this feeling is common** — it is called \'recipient guilt.\' Please know: **donors give willingly and joyfully.** They are not sacrificing — they are honoured to help. The blood you received was donated with love. One day, you may be well enough to donate and pass that gift forward. That is how the blood donation community works — a **chain of compassion**. For now, focus on your recovery. You are worthy of receiving help.' },
        { q: 'I am a regular donor but I feel pressured to donate more often than I am able. What should I do?', a: '**Your health comes first.** It is okay to say **no** or **not right now.** You can only donate every **56 days** — that is the law for your safety. If family or friends pressure you, explain: \'I donate as often as I safely can. My health matters too.\' BloodBridge automatically enforces the 56-day minimum, so even you cannot override it. **Never donate** if you are unwell, tired, or not ready. A healthy donor saves more lives in the long run.' },
        { q: 'How do I cope with the fear of needles so I can donate regularly?', a: '**You can overcome this!** Strategies: 1) **Exposure therapy** — start with a finger-prick test only, then graduate to full donation. 2) **Applied tension** — tense your muscles to raise BP and prevent fainting. 3) **Distraction** — watch a show, listen to a podcast, squeeze a stress ball. 4) **Reward yourself** — plan a treat after donation (your favourite meal). 5) **Bring a supporter** — someone to talk to during the draw. Many blood banks have **experienced phlebotomists** who specialise in nervous donors.' },
        { q: 'My family member died despite receiving blood. I feel angry at the blood bank. Is this fair?', a: '**Your feelings are valid.** Grief is complicated. Blood transfusions are not always successful — the patient\'s underlying condition, timing, and other factors matter. The blood bank staff work hard to provide safe, compatible blood. **Consider:** speaking with a **grief counsellor**, joining a **bereavement support group**, or talking to the blood bank manager to understand what happened. Many families later become **blood donation advocates** in memory of their loved one — a powerful legacy.' },
        { q: 'I have PTSD from a medical procedure. Can I still donate blood?', a: '**Yes, you can**, but take extra precautions. **Before:** Inform the blood bank staff about your PTSD — they will be extra gentle and take it slow. **During:** Request a **private area** if crowds trigger you. Bring a **support person**. Use **grounding techniques** (focus on an object, breathe slowly, describe what you see). **After:** Plan a calm, restful day. If your PTSD is triggered by needles or medical settings specifically, consider **gradual exposure** — start with just visiting a blood bank to familiarise yourself.' },
        { q: 'Can I donate blood if I am on antidepressants or anti-anxiety medication?', a: '**Yes, in almost all cases.** SSRIs (fluoxetine, sertraline, citalopram), SNRIs (venlafaxine, duloxetine), and most anti-anxiety medications are **acceptable** for blood donation. **Important:** Ensure your condition is **stable** and you feel well on donation day. Never skip or stop your medication to donate — your mental health stability is more important. Some **benzodiazepines** may cause drowsiness at higher doses — inform the screening staff. They will assess you individually.' },
        { q: 'My relative refuses blood transfusion for religious reasons. How do I cope with this?', a: '**This is a very difficult situation.** Respect their beliefs while ensuring they understand the medical risks. If the patient is **conscious and competent**, their decision must be respected. **For minors,** courts may intervene if the situation is life-threatening. **What you can do:** ask the doctor about **alternatives** (iron therapy, EPO, cell salvage), request a **hospital ethics committee** consultation, seek **religious counselling** from their faith leader (some denominations have nuanced views), and find **emotional support** for yourself through hospital counselling services.' },
      ],
    },
    {
      category: 'Financial & Cost Guide',
      icon: '\uD83D\uDCB0',
      items: [
        { q: 'How much does it cost to get blood in Bangladesh?', a: 'The **blood itself is free** — all donations are voluntary. However, hospitals and blood banks charge a **processing fee** covering: screening tests (HIV, HBV, HCV, Syphilis, Malaria), blood grouping and cross-matching, storage and cold chain maintenance, blood bag and consumables, and administrative costs. Typical fees in Bangladesh: **Government hospitals** — 300-800 BDT/unit. **Private hospitals** — 800-2,500 BDT/unit. **Standalone blood banks** (Sandhani, Quantum) — 400-1,000 BDT/unit.' },
        { q: 'Can I get free blood from government hospitals in Bangladesh?', a: '**Yes, in many cases.** Government hospital blood banks (DMCH, BSMMU, Sir Salimullah, etc.) provide blood at **subsidised rates** — often 300-500 BDT per unit covering only consumables. Some categories get **free blood**: **Thalassaemia patients** (registered with Health Ministry programme), **Indigent patients** (with approval from hospital director — limited quota), **Emergency disaster victims** (natural calamities, mass casualties). Bring your **NID** and **doctor\'s prescription** to apply for subsidised/ free blood.' },
        { q: 'Does health insurance in Bangladesh cover blood transfusion costs?', a: '**Some do, some don\'t.** **Private health insurance** (Green Delta, Pragati, Beximco, etc.) often covers blood transfusion costs as part of hospitalisation coverage — usually up to **10,000-50,000 BDT** per year for blood. **Government employees** under the **Medical Allowance** scheme can claim up to certain limits. **Check your policy** — look for \'Blood and Blood Products\' under hospitalisation benefits. **Keep all receipts**: processing fee receipts, cross-match charges, and hospital bills for claims.' },
        { q: 'I am a regular donor. Are there any financial benefits or rewards?', a: 'Blood donation in Bangladesh is **voluntary and unpaid** — by law, selling blood is illegal. However, BloodBridge offers **non-monetary rewards**: **Digital badges** (Bronze/Silver/Gold/Platinum), **Donation certificates**, **Free health check-ups** at partner clinics for Platinum donors, **Priority matching** for elite donors in emergencies, **BloodBridge merchandise** (t-shirts, mugs), and **Public recognition** on our donor wall. Some blood banks also offer **free refreshments** and **Tiffin** after donation.' },
        { q: 'Can zakat or charity funds be used for blood transfusions?', a: '**Yes, most scholars agree.** Blood transfusion costs (processing fees) can be covered under **medical expenses** from zakat funds. The blood itself cannot be bought or sold, but the **processing and medical care** surrounding transfusion is a legitimate medical expense. Some **masjid-based charity funds** and **NGOs** (like JAAGO, BRAC, and local welfare organisations) provide financial assistance for blood transfusions to low-income patients. Check with your local mosque or community organisation.' },
        { q: 'What hidden costs should I expect when arranging blood?', a: 'Beyond the processing fee, be prepared for: **Cross-match fee** (200-500 BDT per unit — sometimes separate). **Emergency surcharge** (some banks charge extra for after-hours, 50-100% more). **Transport cost** (cold box delivery van/bike — 200-1,000 BDT depending on distance). **Replacement donor transport** (if you need to bring donors, you may need to arrange their transport). **Multiple visits** (if the first donor gets deferred, another must come). **Total for 1 unit:** typically **1,000-3,500 BDT** all-in.' },
        { q: 'If I donate blood, can my family get free blood later?', a: '**This depends on the blood bank\'s policy.** Some government and non-profit blood banks offer a **family replacement benefit**: if you are a registered regular donor, your immediate family (spouse, children, parents) may receive **priority access** to blood when needed, sometimes at reduced processing fees. **Sandhani** and **Quantum** have such programs. **BloodBridge** tracks your donation history and your family can show your donor certificate to claim this benefit. This is called \'replacement credit\' — ask your blood bank for details.' },
        { q: 'Is there a payment plan or financial aid for patients needing regular transfusions?', a: '**Yes.** Options for regular transfusion patients: **Thalassaemia Foundation of Bangladesh** — subsidised transfusion programmes for registered patients. **Government Thalassaemia Prevention Programme** — free blood and chelation therapy at select centres. **BSMMU Paediatric Haematology Department** — reduced-cost transfusions for children. **Zakat funds** and **welfare organisations** (local). **BloodBridge** — helps coordinate **regular voluntary donors** so you rely less on replacement (saving processing fees). Some corporate CSR programs sponsor thalassaemia patients.' },
        { q: 'How can I raise funds for a patient\'s blood transfusion costs?', a: '**Crowdfunding** is growing in Bangladesh: **Bkash fundraising** — share a wallet number with friends/family. **Online platforms** — TeamAid, GoFundMe, and local crowdfunding sites. **Facebook** — create an \'Emergency Blood Fund\' post — share the hospital, blood type, and Bkash/Rocket number. **Community** — approach your local **mosque, temple, or club** for donations. **NGOs** — JAAGO, Bidyanondo, and local volunteer groups sometimes assist. **Hospital social worker** — ask about charity funds available at the hospital.' },
        { q: 'What documents do I need for insurance claims for blood transfusion?', a: 'For claiming transfusion costs from insurance: 1) **Hospital bill** with itemised blood processing fees. 2) **Doctor\'s prescription** for transfusion (with diagnosis). 3) **Blood bank receipt** (showing date, blood group, units, fees). 4) **Cross-match report**. 5) **Hospital admission/discharge summary**. 6) **Insurance claim form** filled by hospital. 7) **Original NID/passport** for verification. Keep **photocopies** of everything before submitting. Insurance companies may take **15-45 days** to process claims in Bangladesh.' },
      ],
    },
    {
      category: 'Blood Donation for Specific Professions',
      icon: '\uD83D\uDC77\u200D\u2642\uFE0F',
      items: [
        { q: 'I work in a garment factory. Can I donate blood without losing my wages?', a: '**Yes, with planning.** Bangladesh garment factories do not universally have paid leave for blood donation, but many now support it. **Tips:** 1) Ask your **HR department** about donation leave policy — some factories give **2-4 hours paid leave**. 2) Donate on a **Friday or holiday** when the factory is closed and blood banks are open. 3) Use your **lunch break** — the actual draw is only 10 minutes (plus 15 min rest = 25 min total). 4) Show your **BloodBridge donation certificate** to your supervisor — many factories appreciate employees doing social work.' },
        { q: 'I am a rickshaw/uber driver. How can I fit blood donation into my work day?', a: '**Plan strategically:** 1) Donate **early morning** (blood banks open 8-9 AM) — you lose only 30-45 min of work time. 2) The **best time** is mid-morning (9-11 AM) when passenger demand is slightly lower. 3) **Eat a good meal** before (paratha + dal for energy) and drink extra water. 4) **Avoid donating** at the end of a long shift when you are already tired. 5) **Rest 20 min after** before driving again. 6) **Keep dates/gur/chira** in your vehicle for quick energy. Every donation saves lives — your 30 minutes matters more than you know!' },
        { q: 'I am a police officer. Can I donate during duty hours?', a: '**Yes**, many police forces in Bangladesh support blood donation. **Bangladesh Police** headquarters coordinates with blood banks for **organised donation camps** at police lines and barracks. You can also donate at **Police Hospital** (Rajarbagh) blood bank during duty hours with your commanding officer\'s permission. Some **Thana/Police stations** have standing arrangements with nearby blood banks. BloodBridge works with **Police Blood Donor networks** — ask your welfare officer.' },
        { q: 'I am a farmer in a rural area. The nearest blood bank is 2 hours away. Can I still donate?', a: '**Yes!** Options for rural donors: 1) **Mobile blood donation camps** — Sandhani, Quantum, and BloodBridge organise camps in rural areas regularly. Check BloodBridge for upcoming camps near your Upazila. 2) **Plan a trip** to the nearest Upazila Health Complex on market day (combine with errands). 3) **Organise a camp** — if 20+ villagers want to donate, BloodBridge can send a mobile team. 4) **Platelet donors** can donate every 7 days if you want to help more often without travelling far.' },
        { q: 'I am a teacher. How can I encourage my students and colleagues to donate?', a: '**You are in a powerful position!** Ideas: 1) **Organise a school/college donation camp** — BloodBridge provides free medical team and equipment. 2) **Awareness session** — use your period to teach students about blood donation (Science Club activity). 3) **Lead by example** — donate first, then invite others. 4) **Partner with local blood bank** — many offer certificates for student participation. 5) **Create a BloodBridge Campus Club** — students learn leadership while saving lives. Contact **campus@bloodbridge.com** for school program resources.' },
        { q: 'I work in a restaurant kitchen. Can I donate blood at the end of my shift?', a: '**Not recommended.** After a long shift in a hot kitchen, you are likely **dehydrated and tired**. **Better plan:** 1) Donate on your **day off** (Friday). 2) If donating after a shift, **rest for 30 min**, drink **500ml water or coconut water**, eat a full meal, and **wait 1 hour** before going to the blood bank. 3) **Avoid donating** on very hot days after kitchen work — the combined heat exposure + blood loss increases fainting risk. Your safety matters as much as the blood!' },
        { q: 'I am a student living in a university dormitory. How can I donate?', a: '**Easy!** University students are **ideal donors** (young, healthy). Options: 1) **Campus donation camps** — most universities host them 1-2 times per semester through Sandhani or Rotaract clubs. 2) **Nearest blood bank** — most universities are near a hospital with a blood bank (DMCH near DU, BSMMU near Sher-e-Bangla, etc.). 3) **Form a donor group** — register 10-20 student donors on BloodBridge so you support each other. 4) **Use dormitory notice boards** — post BloodBridge\'s emergency helpline for when blood is needed urgently.' },
        { q: 'I am a construction worker doing heavy physical labour. When is the best time to donate?', a: '**Donate on a rest day or Friday.** Your body needs energy for heavy work — after donation, your blood volume drops by 8-10%, making you tire more easily. **Do NOT donate** on a workday and then go to a construction site — risk of fainting, dehydration, and accidents is high. **Best plan:** Donate **Friday morning**, rest for the rest of the day, eat well, drink extra water, and return to work **Saturday** fully recovered. Your health is your biggest asset — protect it.' },
        { q: 'I am a healthcare worker (nurse/doctor). Can I donate during my hospital shift?', a: '**Yes**, many hospitals have **on-site blood banks** where you can donate during a break. **Tips:** 1) Schedule your donation **at shift start** (when you are freshest). 2) Tell your supervisor so they can cover your duties for 20-30 min. 3) **Eat before donating** — skipping meals during shifts is common but dangerous before donation. 4) **After donating**, avoid heavy patient lifting for the rest of your shift. 5) Many hospitals in Bangladesh actively encourage staff to donate and provide **paid donation time**.' },
        { q: 'I am a day labourer. I cannot afford to take a day off. How can I ever donate?', a: '**Your willingness means so much.** Realistic options: 1) Donate on a **Friday** (weekly holiday) — many blood banks open Friday mornings (9 AM-1 PM). 2) The **whole process takes only 30 minutes** — arrive early, donate quickly, and you can still have most of your day. 3) **Eat well the night before** and drink extra water — you need energy. 4) **Rest 1 hour after** before returning to physical work. 5) **You are a hero** — donating despite constraints is exactly what saves lives in Bangladesh. BloodBridge honours donors like you.' },
      ],
    },
    {
      category: 'Pediatric Transfusion Guide',
      icon: '\uD83D\uDC76',
      items: [
        { q: 'My child needs a blood transfusion. How do I prepare them emotionally?', a: '**Honesty and comfort are key.** **For toddlers (1-3 years):** Hold them, sing softly, distract with a toy or video. The IV insertion is the only painful part. **For children (4-8 years):** Explain simply: \'Doctors are giving you special medicine through a tiny tube to make you strong.\' Let them bring a favourite toy. **For older children (9+):** Be honest about what will happen, answer their questions, let them choose a movie or game during the transfusion. **Ask the hospital** if they have a child-life specialist or play therapist.' },
        { q: 'Is blood transfusion safe for infants and newborns?', a: '**Yes, when done properly.** Newborn transfusions use **very small volumes** (10-20ml/kg, about 30-100ml total) and are given **slowly** over 2-4 hours. The blood is specially **irradiated** to prevent graft-versus-host disease (TA-GVHD) and **CMV-screened** (to protect the baby\'s immature immune system). In Bangladesh, common reasons: **neonatal jaundice** requiring exchange transfusion, **anaemia of prematurity**, and **sepsis**. NICUs in major hospitals (DMCH, BSMMU, Square, Apollo) follow international protocols.' },
        { q: 'Can a child with thalassaemia live a normal life with regular transfusions?', a: '**Yes!** With **regular transfusions** (every 3-4 weeks) and **chelation therapy** (to remove excess iron from the body), children with thalassaemia major can grow normally, attend school, play with friends, and have a good quality of life. **Key to success:** 1) **Never skip transfusion appointments.** 2) **Start chelation early** (deferasirox or desferrioxamine). 3) **Monitor iron levels** (ferritin test every 3 months). 4) **Nutrition support** (calcium, vitamin D for bone health). 5) **BloodBridge** can help coordinate regular donors so you never face a shortage.' },
        { q: 'What should I watch for during my child\'s transfusion?', a: '**Stay with your child** the entire time. Watch for: **Fever** or chills (most common sign of reaction), **Rash or hives** (allergic reaction), **Restlessness or crying** (discomfort), **Difficulty breathing** (rare but serious), **Dark urine** (haemolytic reaction — very rare). **Tell the nurse immediately** if your child shows any of these. Most reactions are mild and treatable. The first **15 minutes** of each unit are the most critical — the nurse will monitor closely during this time.' },
        { q: 'My child is terrified of needles. How can I help?', a: '**You are the best person to comfort them.** **For the blood draw/IV insertion:** 1) **Use numbing cream** (EMLA or LMX4) — ask the doctor — it numbs the skin. 2) **Distraction** — blow bubbles, watch a video, play a game on your phone, sing their favourite song. 3) **Deep breathing** — \'Let\'s blow out birthday candles together!\' 4) **Reward** — promise a small treat after (sticker, favourite snack, toy). 5) **Stay calm yourself** — children sense your anxiety. Many paediatric wards have **child-life specialists** trained in distraction techniques.' },
        { q: 'Can my child play and go to school after receiving blood?', a: '**Yes, usually the next day.** After a transfusion, children often feel **more energetic** (since their haemoglobin is now normal). They can usually return to school the **next day** and play normally. **Rest of the transfusion day:** quiet activities at home (reading, drawing, watching shows). **Avoid:** contact sports or rough play for 24 hours (the IV site needs to heal), swimming for 2 days, and heavy physical activity until the next day. Your child\'s doctor will give specific guidance based on their condition.' },
        { q: 'How many transfusions will my child need in their lifetime?', a: '**It depends on the condition.** **Thalassaemia major:** transfusions every 3-4 weeks for life = ~300 transfusions by age 18, ~600+ by age 40. **Sickle cell disease:** intermittent transfusions (some children need monthly, others only during crises). **Cancer patients:** transfusions during chemo cycles (may be 5-20 total, then stop after treatment). **Temporary conditions:** 1-2 transfusions (e.g., dengue, surgery). **Bone marrow transplant** can cure thalassaemia — talk to BSMMU or DMCH about transplant options.' },
        { q: 'What is exchange transfusion for newborn jaundice?', a: '**Exchange transfusion** is a procedure where a small amount of the baby\'s blood is **removed and replaced** with donor blood — like changing the oil in a car. It is used for **severe newborn jaundice** when bilirubin levels are dangerously high and could cause brain damage. The procedure takes **1-2 hours** and is done in the **NICU**. It rapidly reduces bilirubin levels. In Bangladesh, exchange transfusion is available at all major hospital NICUs and has a **95%+ success rate**.' },
        { q: 'My child has cancer and needs frequent transfusions. How can BloodBridge help?', a: '**BloodBridge can make this easier.** 1) **Regular donor scheduling** — coordinate a group of 4-6 compatible donors who take turns donating for your child\'s scheduled transfusions. 2) **Emergency backup** — if a scheduled donor cancels, BloodBridge finds replacements fast. 3) **Track your child\'s transfusion history** — dates, blood types, reactions, and next scheduled date. 4) **Connect with other families** — join our paediatric transfusion support network. 5) **Donor recognition** — we give special \'Paediatric Hero\' badges to donors who support children. Contact **pediatric@bloodbridge.com**.' },
        { q: 'Can a child\'s blood type change after a bone marrow transplant?', a: '**Yes, it can!** After a **bone marrow transplant**, the recipient\'s blood-forming stem cells are replaced by the donor\'s. Over time, the recipient\'s blood type **changes to match the donor\'s**. This is called \'engraftment\' and happens gradually over **weeks to months**. During this transition, the patient may need **special blood products** (irradiated, CMV-negative) and careful monitoring for mixed chimerism. The blood bank must know about the transplant to provide appropriate blood.' },
      ],
    },
    {
      category: 'Bangladeshi Traditional & Herbal Blood Health',
      icon: '\uD83C\uDF3F',
      items: [
        { q: 'Which traditional Bangladeshi foods are best for blood health?', a: '**Our deshi superfoods are excellent!** **Palong shak (spinach)** — iron, folate, vitamin C. **Lal shak (red amaranth)** — rich in iron. **Kala chola (black chickpeas)** — iron + protein. **Dal (masoor, mung, motor)** — plant iron. **Khajur (dates)** — natural iron + energy. **Beetroot (beet)** — iron, folate, nitrates. **Gur (jaggery)** — unrefined iron source. **Til (sesame seeds)** — calcium + iron. **Badam (almonds)** — vitamin E for blood cell health. **Amlaki (Indian gooseberry)** — the richest natural vitamin C source, boosts iron absorption 6x!' },
        { q: 'Does eating kali jeera (black cumin/kalojira) help increase blood?', a: '**Kalojira (Nigella sativa / black cumin)** is traditionally believed to boost blood health in Bangladesh. Scientific studies show it has **anti-inflammatory and antioxidant properties** that may support overall health. However, **there is no strong scientific evidence** that kalojira directly increases haemoglobin or red blood cell count. For proven blood-building: focus on iron-rich foods paired with vitamin C. You can include kalojira as part of a **balanced diet**, but do not rely on it alone to treat anaemia.' },
        { q: 'Is there any herbal tea or drink that helps recovery after blood donation?', a: '**Yes!** Traditional Bangladeshi drinks for post-donation recovery: **Gur + lemon water** — jaggery provides quick iron and energy, lemon provides vitamin C for absorption. **Khejur gurer sharbat** (date molasses drink) — natural iron boost. **Beetroot + apple + ginger juice** — iron, vitamins, anti-inflammatory. **Coconut water (daab paani)** — natural electrolytes for hydration. **Tulsi (holy basil) tea** — traditionally used for strength recovery. **Moringa (shojne) leaf tea** — rich in iron and vitamins. Always pair herbal drinks with a proper meal.' },
        { q: 'Can neem or tulsi leaves help prevent transfusion-transmitted infections?', a: '**No, absolutely not.** Neem (neem) and tulsi (holy basil) have general immune-boosting properties, but they **cannot prevent or treat** blood-borne infections like HIV, Hepatitis B/C, or Malaria. The only way to ensure blood safety is **proper laboratory screening** of every unit before transfusion. All licensed blood banks in Bangladesh test for these diseases. If someone tells you herbal remedies can replace blood screening, **do not believe them** — this is dangerous misinformation that can cost lives.' },
        { q: 'What is \'rokto barano\' (blood increasing) in traditional medicine?', a: 'In traditional Bangladeshi/Kabiraji medicine, \'rokto barano\' refers to treatments believed to increase blood quantity or quality. Common recommendations include: **Shobuj shak** (green leafy vegetables), **Gur and chhola** (jaggery and chickpeas), **Beetroot with honey**, **Shatamuli** (asparagus root — believed to nourish blood), and **Loha bhasma** (iron ash — Ayurvedic preparation). **Important:** If you have been diagnosed with anaemia, it is best to follow **modern medical treatment** (iron supplements, dietary changes, treating the underlying cause). Herbal remedies can complement but not replace medical treatment.' },
        { q: 'Are there any Bangladeshi herbs that interfere with blood donation screening tests?', a: '**Yes, some may cause issues.** Certain herbal products can affect blood chemistry and potentially cause **false positives** in screening tests: **Ashwagandha** — can affect thyroid and liver function tests. **Kalojira** in very high doses. **Green tea extract** supplements — high doses can affect liver enzymes. **Garcinia/HCA** supplements — can affect bilirubin levels. **Turmeric** supplements (not culinary amounts). **Not a deferral** — but **tell the screening staff** about any herbal supplements you take regularly. They will note it and may do additional checks.' },
        { q: 'What is the role of mishti (sweets) in blood donation recovery in Bangladesh?', a: '**Mishti plays a traditional role!** After donation, many blood banks in Bangladesh offer **roshogolla, sandesh, or doi** (yogurt) — these provide **quick sugar for energy** and a sense of celebration. Nutritionally: **Chhana-based sweets** (roshogolla, sandesh) provide protein and calcium. **Gur-based sweets** provide iron. **Doi** provides probiotics and calcium. **However:** Do not rely on sweets alone — you need protein and iron for proper recovery. A hearty khichuri or dal-bhat is better for long-term replenishment.' },
        { q: 'Can I donate blood while taking traditional Kabiraji (herbal) medicine?', a: '**It depends on what you are taking.** Some Kabiraji medicines contain herbs that are safe — others may contain **heavy metals** (lead, arsenic, mercury) which are dangerous for transfusion recipients. **You MUST tell the screening staff** about ALL Kabiraji/herbal medicines you are taking. If the ingredients are unknown or the medicine contains heavy metals, you will likely be **deferred** (temporarily or permanently) to protect both you and the recipient. Always ask your Kabiraj for a list of ingredients.' },
        { q: 'What is \'loha bhashma\' or \'mandoor bhashma\' and can it help with anaemia?', a: '**Loha bhashma** (iron ash/calx) and **Mandoor bhashma** (iron oxide calx) are **Ayurvedic iron preparations** used traditionally for anaemia. They do contain iron and may improve haemoglobin in some people. **However:** 1) The **iron content and bioavailability** varies widely between preparations — not standardised. 2) **Heavy metal contamination** is a concern with some bhashma preparations. 3) They should **only be taken under qualified practitioner guidance**. 4) **Standard modern iron supplements** (ferrous sulfate, ferrous fumarate) are more reliable, tested, and recommended by doctors. Consult your physician before using any bhashma.' },
        { q: 'Can traditional fasting or dietary restrictions affect my ability to donate?', a: '**Yes.** Common restrictions that may affect donation: **Ekadashi fasting** (no grains) — low energy, risk of fainting. **Navratri/upos** — limited food intake can cause low blood sugar. **Pirit/rozar** (religious fasting) — dehydration and low energy. **Rules:** 1) **Always break your fast before donating** — have at least a light meal and water. 2) **Donate after Iftar** if fasting during Ramadan. 3) **Listen to your body** — if fasting makes you weak, postpone donation. 4) **No religious tradition** prohibits eating before saving lives — donation is exempt from fasting rules in Islam, Hinduism, and other faiths.' },
      ],
    },
    {
      category: 'Apheresis & Platelet Donation Guide',
      icon: '\uD83D\uDE0A',
      items: [
        { q: 'What is apheresis donation and how is it different from whole blood donation?', a: '**Apheresis** is a special donation where a machine draws your blood, separates out **one component** (platelets, plasma, or RBCs), and returns the rest to you. **Key differences:** **Time** — whole blood: 5-10 min draw vs apheresis: 60-90 min. **Frequency** — whole blood: every 56 days vs platelets: every 7 days (up to 24x/year). **Recovery** — same-day for both. **Needle** — apheresis uses both arms (one to draw, one to return) — or one arm with a dual needle. **Effect on body** — apheresis removes only specific components, so less strain on your body.' },
        { q: 'Who needs platelet donations the most in Bangladesh?', a: '**Dengue patients** are the biggest consumers of platelets in Bangladesh, especially during monsoon season (May-October). Other critical needs: **Cancer patients** (leukaemia, lymphoma) undergoing chemotherapy — they need frequent platelets because chemo destroys bone marrow. **Aplastic anaemia patients** — bone marrow doesn\'t produce enough platelets. **Dengue haemorrhagic fever** — dangerously low platelets with bleeding risk. **Open heart surgery patients** — heart-lung machine can damage platelets. **Bone marrow transplant recipients** — need platelets until donor cells engraft.' },
        { q: 'Does platelet donation hurt more than whole blood donation?', a: '**Not really.** The needle insertion is the same as whole blood — a brief pinch. The **main difference** is the duration: you sit for 60-90 minutes instead of 5-10 minutes. Some donors feel a **tingling sensation** around the lips or fingers during the return cycle (from the anticoagulant citrate used to prevent clotting) — this is normal and passes quickly. The staff can give you a calcium supplement (Tums) to reduce the tingling. **Many donors prefer apheresis** because you can donate more frequently and help more patients.' },
        { q: 'I want to donate platelets for dengue patients. What do I need to know?', a: '**Thank you!** Dengue season (May-Oct) is when platelet demand surges in Bangladesh. **Requirements:** Same eligibility as whole blood (18-65 yrs, 50kg+, healthy). **Extra:** Good **vein access** (both arms preferred), no aspirin/NSAIDs for **72 hours before** (platelets are sensitive to aspirin), and a **2+ hour time commitment** (1-1.5 hr donation + prep/rest). **Platelets have a shelf life of only 5-7 days**, so you may be called on short notice when a specific patient needs them. BloodBridge gives **priority notifications** to platelet donors during dengue season.' },
        { q: 'Can I donate platelets more often than whole blood?', a: '**Yes!** Platelets: every **7 days** (up to 24 times per year). Whole blood: every **56 days** (up to 6 times per year). Your body replenishes platelets within **48-72 hours**, while red blood cells take 4-6 weeks. However, your body still needs time to recover — platelet donors often have their **total protein and platelet count** checked before each donation to ensure they are safe. You cannot donate platelets if you have taken **aspirin/NSAIDs** within the past 3 days.' },
        { q: 'Where can I donate platelets in Bangladesh?', a: 'Platelet apheresis is available at: **DMCH Blood Bank** (Dhaka — largest volume), **BSMMU Transfusion Medicine Department**, **Apollo Hospitals Dhaka** (now Evercare), **Square Hospitals Ltd.**, **United Hospital** (Gulshan), **LabAid Cardiac Hospital**, **Comfort Hospital** (Dhanmondi), and **CHI Hospital** (Uttara). In **Chattogram**: **CMCH** and **CSCR**. In **Sylhet**: **Sylhet MAG Osmani Medical College**. Call ahead to check machine availability and appointment slots.' },
        { q: 'What should I eat before a platelet donation?', a: '**Important:** Avoid fatty and oily foods (paratha, fried snacks, rich curries) for **24 hours before** — fat in your blood makes the plasma milky (lipaemic) and the machine may reject it. **Eat:** Light, low-fat meals — plain rice, dal, boiled vegetables, roti, fruits, toast with jam/honey. **Drink:** Plenty of water (500+ ml in the 2 hours before). **Avoid:** Milk, cream, butter, ghee, oil-fried foods, nuts, seeds, avocado, and fatty meats before donation. **The day before:** have a normal meal, just avoid very oily food in the evening.' },
        { q: 'I have a family member with dengue and critically low platelets. How do I arrange platelet donation fast?', a: '**Act quickly — platelets expire in 5 days!** 1) Check if the hospital can do **apheresis** — one donor provides a full dose. 2) If no apheresis machine, ask **5-6 compatible donors** to donate **whole blood** (each whole blood unit provides some platelets — it takes multiple donors to make one platelet dose). 3) Post an **emergency platelet request** on BloodBridge — specify \'Platelets needed for dengue patient.\' 4) Contact **Sandhani** or **Badhon** — they have platelet donor lists. 5) Call **BloodBridge helpline 08000-123-456** for emergency coordination.' },
        { q: 'What is the difference between random donor platelets and single donor platelets?', a: '**Random donor platelets (RDP):** Made from **whole blood donations** — platelets from 4-6 different donors are pooled together to make one adult dose. Lower cost, but higher infection risk (more donors). **Single donor platelets (SDP):** Collected from **one donor** via apheresis — one donor provides a full dose. Lower infection risk, less donor exposure, and may be more effective for patients who need frequent platelets (cancer, bone marrow transplant). SDP is preferred for patients who need regular transfusions.' },
        { q: 'Can I donate plasma too? What is the process?', a: '**Yes!** Plasma donation (plasmapheresis) takes about **45 minutes**. Your blood is drawn, the **plasma** is separated (the liquid portion containing clotting factors and antibodies), and your RBCs and platelets are returned. **Frequency:** every **28 days**, up to **13 times per year**. **Uses:** Fresh Frozen Plasma (FFP) for liver disease, massive bleeding, and warfarin reversal. **Convalescent plasma:** from recovered COVID/dengue patients — contains antibodies that help current patients. **Requirements:** Same as whole blood + good veins + 2+ hours time.' },
      ],
    },
    {
      category: 'Social & Community Mobilization',
      icon: '\uD83E\uDD1D',
      items: [
        { q: 'How can I convince my family members to donate blood?', a: '**Start with empathy, not pressure.** Many Bangladeshi families have **fears and myths** about blood donation. **Effective talking points:** 1) \'You can save up to **3 lives** with one donation.\' 2) \'It is **completely safe** — sterile needles, single use.\' 3) \'It is **halal/punno** (religiously rewarded).\' 4) \'What if **our family member** needs blood someday?\' 5) \'It only takes **20 minutes** and you get free check-up (BP, Hb, blood group).\' 6) **Lead by example** — donate first, show them your certificate. 7) **Take them along** when you donate next — seeing the process removes fear.' },
        { q: 'There are many superstitions about blood donation in my village. How do I address them?', a: 'Common Bangladeshi superstitions and the **facts**: **Myth:** \'Blood donation makes you weak forever.\' **Fact:** You recover in 24-48 hours. **Myth:** \'Donating blood causes impotence/ infertility.\' **Fact:** No effect on reproductive health. **Myth:** \'Blood should not leave the body — it is life force.\' **Fact:** Your body constantly makes new blood — donation stimulates production. **Myth:** \'Women who donate cannot bear children.\' **Fact:** Millions of women donate and have healthy children. **Best approach:** Use **respected community members** (imam, teacher, doctor, UP member) to spread accurate information. **BloodBridge** can send a health educator to your village.' },
        { q: 'How can I organise a blood donation camp at my local mosque or temple?', a: '**Excellent idea!** **Steps:** 1) Speak to the **imam/pujari/committee** — explain that saving lives is a holy act. 2) Contact **BloodBridge** (camp@bloodbridge.com) or **Sandhani** — they provide: medical team, blood bags, beds, screening kits, and refreshments. 3) **Announce** after Friday prayers (Jummah) or during temple gatherings. 4) Set a **date** (Friday/Sunday best for most people). 5) **Prepare** the venue with separate areas for registration, screening, donation, and rest. 6) **Target 50-100 donors** per camp. 7) **Recognise donors** — certificates and thanks from the religious leader.' },
        { q: 'How do I start a blood donation club in my neighbourhood or apartment complex?', a: '**Simple!** 1) **Talk to 5-10 neighbours** — gauge interest. 2) **Create a WhatsApp/Facebook group** — \'Our Area Blood Donors.\' 3) **Register on BloodBridge** as a community donor group. 4) **Collect info**: blood types, phone numbers, availability. 5) **Organise a mini-camp** — BloodBridge can bring a small team for 20-30 donors in a community centre or large apartment lobby. 6) **Keep a list** of who donated when — so you know who is eligible each month. 7) **Celebrate** — recognise donors, share stories. Apartment-based groups are powerful — you can respond fast when a neighbour needs blood!' },
        { q: 'Can I use social media (Facebook) to find blood donors? How do I do it safely?', a: '**Yes, Facebook is widely used in Bangladesh for blood requests.** **Best practices for safety:** 1) **DO** post: patient\'s name, blood group, hospital, doctor\'s contact, and urgency level. 2) **DON\'T post:** patient\'s full address, NID number, or personal photos without consent. 3) **Verify donors** — ask for their BloodBridge profile or previous donation proof. 4) **Avoid cash requests** — legitimate donors never ask for money. 5) **Use BloodBridge\'s share feature** — share the emergency request directly from the platform. 6) **Join existing groups** — \'Blood Donors Bangladesh\', \'Raktodata Bangladesh\', and district/upazila-specific blood groups.' },
        { q: 'How can I convince my employer to organise a corporate blood donation drive?', a: '**Present the business case:** 1) **CSR value** — blood donation drives show community commitment. 2) **Team building** — employees bond through giving together. 3) **Free health screening** — everyone gets BP check, blood group, and Hb test for free. 4) **Positive PR** — shareable photos and stories for company social media. 5) **Low cost** — BloodBridge provides everything free — company just provides space and time (2-4 hours). 6) **Employee satisfaction** — 90% of participants say it is a meaningful experience. **Contact:** **corporate@bloodbridge.com** for a presentation package.' },
        { q: 'I want to donate blood on my birthday. How do I make it special?', a: '**Birthday donation is a growing trend in Bangladesh!** **Make it special:** 1) **Book a slot** at your nearest blood bank in advance. 2) **Invite friends** to join you — start a \'Birthday Donor Chain.\' 3) **Post on social media** with the BloodBridge birthday badge. 4) **Donate in honour** of someone (parent, child, friend). 5) **Set a goal** — donate every birthday and track your streak. 6) **Organise a small camp** with friends — 5-10 of you donate together, then celebrate with a meal. BloodBridge gives **special birthday donor certificates** and **badges** on your profile.' },
        { q: 'Our college wants to hold an inter-department blood donation competition. How does it work?', a: '**Fun and impactful!** **How it works:** 1) Each department (Science, Arts, Business, Engineering) registers their team. 2) Monthly/quarterly donation camps held on campus. 3) Points: 1 point per donation, 2 points per first-time donor, 3 points per O-negative donor, bonus points for recruiting new donors. 4) **Trophy + Certificate** for winning department. 5) BloodBridge provides: **Live leaderboard** on campus website, **progress tracking**, and **end-of-year awards**. Many Bangladeshi universities (DU, BUET, JU, NSU, BRAC) run successful inter-department competitions. Contact **campus@bloodbridge.com** to set up yours!' },
        { q: 'How do I thank blood donors who saved my family member\'s life?', a: '**A heartfelt thank-you means so much to donors!** Ideas: 1) **Call or SMS** — a simple \'Thank you, you saved my father\'s life\' is powerful. 2) **BloodBridge \'Thank a Donor\'** feature — send an anonymous thank-you through the platform. 3) **Send a photo** (with permission) of the recovering patient. 4) **Share your story** — many donors are inspired when they hear the outcome. 5) **Become a donor yourself** — the best thank-you is passing the gift forward. 6) **Recognise them publicly** (with their permission) on Facebook or in community groups. Most donors say \'knowing I helped is enough.\'' },
        { q: 'What should I do if I see a fake blood request on social media?', a: '**Sadly, fake requests do happen.** **How to spot fakes:** Same post shared in 100+ groups, no hospital name or doctor contact, outdated viral post from years ago, requests for \'any blood group\' (unusual), or asks for money not blood. **What to do:** 1) **Don\'t share** without verifying. 2) **Call the hospital** mentioned to confirm. 3) **Check BloodBridge** — all our requests are verified. 4) **Report** the post to the group admin. 5) **Comment** asking for more details — fake posters often disappear. **Helpful response:** \'Please use BloodBridge for verified requests — I can help you post there.\' This keeps the system trustworthy for real emergencies.' },
      ],
    },
    {
      category: 'Expat & Non-Bangladeshi Donor Guide',
      icon: '\u2708\uFE0F\uD83C\uDFE0',
      items: [
        { q: 'Can foreigners living in Bangladesh donate blood?', a: '**Yes!** Foreigners residing in Bangladesh can donate blood if they: Are **aged 18-65**, weigh **50kg+**, are in **good general health**, have a **valid passport** and residence permit/visa, have been in Bangladesh for **at least 6 months** (for observation — some exceptions for longer-term residents), and **do not have vCJD risk** (lived in UK 1980-1996 for 3+ months). Many expats donate regularly at **DMCH, Square, Apollo, and United Hospital** blood banks. Your donation helps the Bangladeshi community that hosts you!' },
        { q: 'I am a foreigner and do not speak Bangla well. Can I still donate at a Bangladeshi blood bank?', a: '**Yes!** Major hospital blood banks in Dhaka (Square, Apollo/Evercare, United, LabAid) have **English-speaking staff**. The health screening questionnaire is available in English. If you go to a government hospital, bring a **Bangla-speaking friend** or use Google Translate. **BloodBridge** also has an **English interface**. Key phrases to know: \'Ami raktodan korte chai\' (I want to donate blood). \'Amar blood group O positive\' (My blood group is...). Staff appreciate your effort. Donating is a wonderful way to give back to Bangladesh!' },
        { q: 'I am an NRI (Non-Resident Bangladeshi) visiting home. Can I donate blood during my visit?', a: '**Yes, and thank you!** NRB donors are especially valuable because they often have: 1) **Lower exposure** to local endemic diseases (making blood safer). 2) **Rare blood types** more common in certain regions. 3) **Fresh perspective** to share good practices. **Requirements:** NID or Bangladeshi passport, been in Bangladesh for **at least 72 hours** (for observation), meet all standard criteria. Visit duration does not affect eligibility (unless you came from a malaria/vCJD risk area — check with the blood bank). Your blood can save lives in your homeland!' },
        { q: 'Can Rohingya refugees or stateless persons donate blood in Bangladesh?', a: '**This is a complex humanitarian issue.** Currently, **Rohingya refugees** living in camps (Cox\'s Bazar) are **generally not accepted as blood donors** due to: lack of recognised identification documents accepted by standard blood banks, lack of verified medical history, and regulatory restrictions. **However:** Humanitarian organisations like **UNHCR, WHO, and IOM** coordinate emergency blood supplies for refugee camps through their own systems. Individual refugee cases may be assessed by the blood bank physician on a case-by-case basis. BloodBridge advocates for inclusive policies.' },
        { q: 'My passport is at the immigration office for visa processing. Can I use another ID?', a: '**Blood banks typically require a government-issued photo ID.** Options if your passport is unavailable: **NID** (if you have one), **Driving license** (Bangladeshi or international), **Refugee card** (for registered refugees), or **Employer ID card** with photo (some private blood banks may accept). For **government blood banks**, a passport is usually mandatory. **Best bet:** Call the blood bank in advance and ask what alternative IDs they accept. Or wait until your passport is returned.' },
        { q: 'I am from the UK and lived there during 1980-1996. Can I donate blood in Bangladesh?', a: '**Unfortunately, this is a permanent deferral** in most countries, including Bangladesh. Anyone who lived in the **UK for 3+ months between 1980-1996** is permanently deferred due to the theoretical risk of **vCJD** (mad cow disease) transmission through blood. This deferral applies globally (USA, Canada, Australia, Japan, EU, and Bangladesh). It cannot be waived. However, you can still: 1) **Volunteer** with BloodBridge (awareness, organisation, fundraising). 2) **Advocate** for blood donation. 3) **Encourage** family and friends to donate. Your support is still valuable!' },
        { q: 'Do I need a Bangladeshi NID to register on BloodBridge as a foreigner?', a: '**No**, foreigners can register using their **passport number** as ID. On the signup form, select \'Foreign National\' as ID type and enter your passport number. You will also need: your **current address in Bangladesh**, **phone number** (local SIM recommended), and **email**. Your BloodBridge profile will show your country of origin flag. Some features (like emergency donor alerts via SMS) work best with a Bangladeshi phone number — get a local SIM if you are staying long-term.' },
        { q: 'I travel frequently between Bangladesh and other countries. Can I still be a regular donor?', a: '**Yes, but travel affects eligibility.** BloodBridge tracks your **travel history** and calculates deferral periods automatically. **No waiting** for travel to most developed countries. **6 months deferral** after returning from malaria-endemic areas. **28 days** after Zika-affected areas. **Permanent** for vCJD-risk countries (UK 1980-96). **Best practice:** Update your travel history in BloodBridge\'s **Travel Log** feature, and check your eligibility status after each international trip. The system will let you know when you are eligible again.' },
        { q: 'Can international schools and expat communities organise blood drives?', a: '**Absolutely!** Expat blood drives are valuable because they bring **diverse blood types** into the local supply. **Steps:** 1) Contact **BloodBridge** (camp@bloodbridge.com). 2) We provide: English-speaking medical team, all equipment, and awareness materials in English. 3) **Venue:** Your school/office/club. 4) **Target:** 20-50 donors per drive. 5) **Documents:** Passport + visa/residence permit. 6) **Timing:** Weekend drives work best for expats. International School Dhaka (ISD), American International School (AISD), and various embassies have hosted successful drives with BloodBridge.' },
        { q: 'I am a diplomat stationed in Bangladesh. Are there special considerations for my donation?', a: '**Diplomats are welcome to donate!** **Note:** Your **diplomatic passport** is accepted as ID. You may have **diplomatic immunity** — the blood bank will still follow standard screening procedures. Your donation is handled with the same confidentiality as all donors. Some diplomats prefer to donate at **private hospitals** (Square, Evercare) for convenience. BloodBridge can help arrange appointments at your preferred location. Your donation sets a powerful example of solidarity with Bangladesh!' },
      ],
    },
    {
      category: 'Positive Test Result Guide',
      icon: '\uD83D\uDD0D',
      items: [
        { q: 'What happens if my donated blood tests positive for a disease?', a: '**Don\'t panic.** A \'reactive\' screening test does NOT necessarily mean you have the disease — it is a **preliminary test** that can have false positives. **The process:** 1) The blood bank performs a **confirmatory test** on a fresh sample. 2) You will be contacted **confidentially** by the blood bank counsellor. 3) You are asked to visit for **counselling and repeat testing**. 4) Based on confirmatory results, you will be referred to a **specialist** if needed. 5) Your personal information is **strictly confidential** — not shared with employer, family, or anyone without your consent.' },
        { q: 'I was told I have Hepatitis B from blood donation screening. What should I do now?', a: '**First, confirm the result.** A positive HBsAg screening needs a confirmatory test. If confirmed: 1) **See a gastroenterologist or hepatologist** at BSMMU, DMCH, or a private hospital. 2) They will do **HBV DNA, HBeAg, and liver function tests** to determine if you have active infection or are a carrier. 3) **Treatment** is available and effective — antivirals (tenofovir, entecavir) can suppress the virus and prevent liver damage. 4) **Vaccinate close family** — Hepatitis B spreads through blood and sexual contact. 5) You are **permanently deferred** from blood donation — but you can still be a powerful advocate for blood safety.' },
        { q: 'The blood bank says my blood tested reactive for syphilis (VDRL positive). Am I infected?', a: '**Not necessarily.** The screening test (VDRL/RPR) can have **false positives** due to: pregnancy, recent vaccination, autoimmune diseases, malaria, tuberculosis, or leprosy — all common in Bangladesh. **Next steps:** 1) Visit the blood bank for a **confirmatory TPHA/FTA-ABS test**. 2) If confirmatory is **negative** — you are clear (false positive). 3) If confirmatory is **positive** — you need treatment (a single penicillin injection cures early syphilis). 4) **Inform your partner** — they should also be tested. 5) Syphilis is **100% curable**. You will be deferred from donation until treated and cured.' },
        { q: 'My blood tested positive for malaria. What does this mean?', a: '**If confirmed:** 1) You likely have **active malaria** and need treatment immediately — see a doctor for antimalarial medication (ACT, chloroquine depending on type). 2) **Common in Bangladesh**: Chattogram Hill Tracts, Sundarbans, and Mymensingh regions — if you travelled there recently, that explains it. 3) After **successful treatment** and 1 year symptom-free, you MAY be eligible to donate again. 4) **Tell your family** if you had symptoms — malaria can spread through mosquitoes in your home. 5) Use **mosquito nets and repellent** to prevent future infection and re-donation eligibility.' },
        { q: 'Will my employer or family find out about my positive test result?', a: '**Absolutely not.** Blood banks follow strict **confidentiality protocols**. Your test result is **medical confidential information** protected by law. The blood bank will: Contact **only you** (not your family or employer). Not share results with **any third party** without your written consent. Not mark it on any public records. **Exceptions:** If you have a **reportable disease** (like certain strains of Hepatitis), it may be confidentially reported to the **DGHS** for public health tracking — but your name is not publicly shared. Your job, family relationships, and standing in the community are protected.' },
        { q: 'I was permanently deferred from donating. Can I ever donate again?', a: '**Permanent deferral** means exactly that — you cannot donate blood again in your lifetime. This applies for: HIV positive, Hepatitis B/C carriers, certain cancers, chronic diseases, and vCJD risk. **It is not a punishment** — it protects both you and potential recipients. **You can still contribute:** 1) **Awareness volunteer** — share your story to encourage others. 2) **Fundraising** for blood banks and thalassaemia patients. 3) **Organise camps** — you can coordinate, even if you cannot donate. 4) **BloodBridge advocate** — help us spread accurate information about blood donation. Your experience is valuable.' },
        { q: 'I think the blood bank made a mistake. My result was positive but I am healthy. Can I retest?', a: '**Yes, you have the right to a retest.** 1) Ask the blood bank for a **confirmatory test** (using a different method — ELISA vs. NAT, or Western blot for HIV). 2) If still positive, you can **independently retest** at another licensed lab (Square, LabAid, Popular Diagnostics) — take a copy of the first result. 3) If your **independent test is negative**, talk to the blood bank physician — there may have been a **lab error** or **crossed sample**. 4) False positives do happen — about **1 in 1,000** screening tests is a false positive. Do not assume the worst until confirmed.' },
        { q: 'I received a letter from the blood bank to come for counselling. Should I be worried?', a: '**Don\'t panic — it may be nothing serious.** The letter could mean: 1) Your screening tests showed a **borderline result** that needs repeat. 2) The blood bank needs **more information** about your medical history. 3) Your haemoglobin was low and they want to check you for anaemia. 4) A **confirmatory test** is needed. **What to do:** Go to the appointment as scheduled. Bring your NID. The counsellor will explain everything clearly and confidentially. You can bring a **trusted family member** for support. Most counselling visits end with good news or manageable advice.' },
        { q: 'I am HIV positive and found out through blood donation screening. What support is available in Bangladesh?', a: '**First, we are sorry you received this news — but early detection is important.** If confirmed: 1) **Immediately visit** the **National AIDS/STD Programme (NASP)** at Mohakhali, Dhaka, or any **government ICT centre** — they provide free: **CD4 count testing**, **ART (antiretroviral therapy)** medications, and **counselling**. 2) **ART is free** in Bangladesh through government hospitals. 3) **Support organisations**: **Ashar Alo Society** (Kolkata+BD), **Bandhu Social Welfare Society**, and **Ishwar Foundation**. 4) **You can live a long, healthy life** with proper treatment. 5) **Your confidentiality** is protected — blood banks do not disclose HIV status without consent. You are not alone.' },
        { q: 'I tested positive for Hepatitis C. Is this curable?', a: '**Yes! Hepatitis C is now curable.** Modern **Direct-Acting Antiviral (DAA)** medications (sofosbuvir, daclatasvir, ledipasvir) cure over **95% of cases** in 8-12 weeks. **In Bangladesh:** DAAs are available at: BSMMU Hepatology Department, DMCH Gastroenterology, and private clinics. **Cost:** Government hospitals provide DAAs at **subsidised rates** (5,000-15,000 BDT for full course). Private: 50,000-150,000 BDT. **Steps:** 1) Confirm with HCV RNA test. 2) See a hepatologist. 3) Start DAA treatment. 4) After **cure confirmation** (sustained virologic response at 12 weeks), you are healthy and cannot transmit the virus. However, you remain **permanently deferred** from blood donation.' },
      ],
    },
  ];

  var msgCount = 0;

  /* ========================================================
     DOM REFS
  ======================================================== */
  var $ = function (id) { return document.getElementById(id); };
  var els = {};

  /* ========================================================
     TEMPLATES
  ======================================================== */
  var SVG_DROP = '<svg viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wg" x1="0%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="45%" stop-color="#F8EEEE"/><stop offset="100%" stop-color="#E8CCCC"/></linearGradient><linearGradient id="rg" x1="0%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#FF4D6D"/><stop offset="20%" stop-color="#D90429"/><stop offset="50%" stop-color="#C1121F"/><stop offset="75%" stop-color="#A00010"/><stop offset="100%" stop-color="#7B0000"/></linearGradient><radialGradient id="ws" cx="22%" cy="18%" r="42%"><stop offset="0%" stop-color="rgba(255,255,255,0.85)"/><stop offset="30%" stop-color="rgba(255,255,255,0.15)"/><stop offset="100%" stop-color="transparent"/></radialGradient><radialGradient id="rs" cx="22%" cy="18%" r="42%"><stop offset="0%" stop-color="rgba(255,255,255,0.6)"/><stop offset="30%" stop-color="rgba(255,255,255,0.1)"/><stop offset="100%" stop-color="transparent"/></radialGradient><filter id="is"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(120,10,20,0.3)"/></filter></defs><path d="M 50 2 C 53 5, 57 11, 62 18 C 70 34, 80 46, 82 58 C 84 72, 77 95, 50 95 C 23 95, 16 72, 18 58 C 20 46, 30 34, 38 18 C 43 11, 47 5, 50 2 Z" fill="url(#wg)"/><path d="M 47 9 C 51 9, 54 13, 56 19 C 58 25, 56 31, 52 35 C 47 39, 43 35, 40 29 C 38 23, 40 17, 43 13 C 44 10, 46 9, 47 9 Z" fill="url(#ws)"/><path d="M 50 20 C 52 22, 55 26, 58 30 C 63 40, 70 48, 71 56 C 72 65, 68 80, 50 80 C 32 80, 28 65, 29 56 C 30 48, 37 40, 42 30 C 45 26, 48 22, 50 20 Z" fill="url(#rg)" filter="url(#is)"/><path d="M 48 25 C 50 25, 52 27, 53 30 C 55 34, 54 38, 51 40 C 48 42, 46 38, 44 34 C 43 31, 44 28, 46 26 C 47 25, 47 25, 48 25 Z" fill="url(#rs)"/></svg>';
  var SVG_AVATAR = '<svg viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ag" x1="0%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#FF4D6D"/><stop offset="18%" stop-color="#D90429"/><stop offset="45%" stop-color="#C1121F"/><stop offset="72%" stop-color="#A00010"/><stop offset="100%" stop-color="#7B0000"/></linearGradient><radialGradient id="ah" cx="22%" cy="18%" r="42%"><stop offset="0%" stop-color="rgba(255,255,255,0.35)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><path d="M 50 2 C 53 5, 57 11, 62 18 C 70 34, 80 46, 82 58 C 84 72, 77 95, 50 95 C 23 95, 16 72, 18 58 C 20 46, 30 34, 38 18 C 43 11, 47 5, 50 2 Z" fill="url(#ag)"/><path d="M 50 2 C 53 5, 57 11, 62 18 C 70 34, 80 46, 82 58 C 84 72, 77 95, 50 95 C 23 95, 16 72, 18 58 C 20 46, 30 34, 38 18 C 43 11, 47 5, 50 2 Z" fill="url(#ah)"/><g class="rak-plus-sign"><rect x="46" y="38" width="8" height="24" rx="2" fill="rgba(255,255,255,0.85)"/><rect x="38" y="46" width="24" height="8" rx="2" fill="rgba(255,255,255,0.85)"/></g></svg>';
  var SVG_SEND = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  var SVG_MAXIMIZE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>';
  var SVG_CLOSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  /* ========================================================
     BUILD DOM
  ======================================================== */
  function insertChat() {
    if ($('raktosathi-wrapper')) return;

    var wrapper = document.createElement('div');
    wrapper.id = 'raktosathi-wrapper';

    wrapper.innerHTML =
      '<div id="rak-panel">' +
        '<div class="rak-header">' +
          '<div class="rak-header-left">' +
            '<div class="rak-header-avatar">' +
              '<span style="position:relative;z-index:1;display:flex;">' + SVG_AVATAR + '</span>' +
              '<div class="rak-avatar-pulse"></div>' +
            '</div>' +
            '<div class="rak-header-info">' +
              '<div class="rak-header-name">Raktosathi</div>' +
              '<div class="rak-header-status"><span class="rak-dot"></span> Online</div>' +
            '</div>' +
          '</div>' +
          '<div class="rak-header-actions">' +
            '<button class="rak-header-btn" id="rakGuestSignIn" title="Sign In" style="display:none;">\uD83D\uDD12</button>' +
            '<button class="rak-header-btn" id="rakFaqBtn" title="FAQs">\u2049</button>' +
            '<button class="rak-header-btn" id="rakMaximizeBtn" title="Fullscreen">' + SVG_MAXIMIZE + '</button>' +
            '<button class="rak-header-btn" id="rakCloseBtn" title="Close">' + SVG_CLOSE + '</button>' +
          '</div>' +
        '</div>' +

        '<div class="rak-messages" id="rakMessages">' +
          '<button class="rak-scroll-btn" id="rakScrollBtn">\u2193</button>' +
        '</div>' +

        '<div class="rak-input-area" id="rakInputArea">' +
          '<textarea id="rakInput" class="rak-input" rows="1" placeholder="Type a message..."></textarea>' +
          '<button class="rak-send-btn" id="rakSendBtn">' + SVG_SEND + '</button>' +
        '</div>' +

        '<div class="rak-suggestions" id="rakSuggestions"></div>' +
        '<div class="rak-welcome" id="rakWelcome">' +
          '<div class="rak-3d-drop-container">' +
            '<div class="rak-heartbeat"></div>' +
            '<div class="rak-drop-shadow-3d"></div>' +
            '<div class="rak-drop-shadow-3d-2"></div>' +
            '<div class="rak-drop-3d-persp">' +
            '<div class="rak-3d-drop">' +
              '<svg class="rak-drop-svg" viewBox="0 0 100 100" width="80" height="96">' +
                '<defs>' +
                  '<linearGradient id="rakBodyGrad" x1="0%" y1="0%" x2="80%" y2="100%">' +
                    '<stop offset="0%" stop-color="#FF4D6D"/>' +
                    '<stop offset="18%" stop-color="#D90429"/>' +
                    '<stop offset="45%" stop-color="#C1121F"/>' +
                    '<stop offset="72%" stop-color="#A00010"/>' +
                    '<stop offset="100%" stop-color="#7B0000"/>' +
                  '</linearGradient>' +
                  '<radialGradient id="rakSpecGrad" cx="22%" cy="18%" r="42%">' +
                    '<stop offset="0%" stop-color="rgba(255,255,255,0.9)"/>' +
                    '<stop offset="30%" stop-color="rgba(255,255,255,0.18)"/>' +
                    '<stop offset="100%" stop-color="transparent"/>' +
                  '</radialGradient>' +
                  '<radialGradient id="rakSpecGrad2" cx="55%" cy="65%" r="35%">' +
                    '<stop offset="0%" stop-color="rgba(255,255,255,0.15)"/>' +
                    '<stop offset="50%" stop-color="rgba(255,255,255,0.05)"/>' +
                    '<stop offset="100%" stop-color="transparent"/>' +
                  '</radialGradient>' +
                  '<radialGradient id="rakGlowGrad" cx="46%" cy="40%" r="45%">' +
                    '<stop offset="0%" stop-color="rgba(255,77,109,0.55)"/>' +
                    '<stop offset="50%" stop-color="rgba(255,77,109,0.12)"/>' +
                    '<stop offset="100%" stop-color="transparent"/>' +
                  '</radialGradient>' +
                  '<radialGradient id="rakEdgeGrad" cx="68%" cy="52%" r="30%">' +
                    '<stop offset="0%" stop-color="rgba(255,77,109,0.25)"/>' +
                    '<stop offset="100%" stop-color="transparent"/>' +
                  '</radialGradient>' +
                  '<radialGradient id="rakCoronaGrad" cx="50%" cy="50%" r="50%">' +
                    '<stop offset="0%" stop-color="rgba(232,41,74,0.08)"/>' +
                    '<stop offset="100%" stop-color="transparent"/>' +
                  '</radialGradient>' +
                  '<filter id="rakSvgShadow">' +
                    '<feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="rgba(150,10,20,0.55)"/>' +
                  '</filter>' +
                  '<filter id="rakSvgRimGlow">' +
                    '<feGaussianBlur stdDeviation="3" result="blur"/>' +
                    '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
                  '</filter>' +
                '</defs>' +
                '<path class="rak-svg-corona" d="M 50 2 C 53 5, 57 11, 62 18 C 70 34, 80 46, 82 58 C 84 72, 77 90, 50 90 C 23 90, 16 72, 18 58 C 20 46, 30 34, 38 18 C 43 11, 47 5, 50 2 Z" fill="url(#rakCoronaGrad)"/>' +
                '<path class="rak-svg-rim" d="M 50 0 C 54 3, 58 9, 63 16 C 71 32, 82 44, 84 58 C 86 74, 78 93, 50 93 C 22 93, 14 74, 16 58 C 18 44, 29 32, 37 16 C 42 9, 46 3, 50 0 Z" fill="none" stroke="rgba(255,77,109,0.15)" stroke-width="3" filter="url(#rakSvgRimGlow)"/>' +
                '<path class="rak-svg-body" d="M 50 2 C 53 5, 57 11, 62 18 C 70 34, 80 46, 82 58 C 84 72, 77 90, 50 90 C 23 90, 16 72, 18 58 C 20 46, 30 34, 38 18 C 43 11, 47 5, 50 2 Z" fill="url(#rakBodyGrad)" filter="url(#rakSvgShadow)"/>' +
                '<path class="rak-svg-glow" d="M 50 2 C 53 5, 57 11, 62 18 C 70 34, 80 46, 82 58 C 84 72, 77 90, 50 90 C 23 90, 16 72, 18 58 C 20 46, 30 34, 38 18 C 43 11, 47 5, 50 2 Z" fill="url(#rakGlowGrad)" opacity="0.4"/>' +
                '<path class="rak-svg-edge-glow" d="M 50 2 C 53 5, 57 11, 62 18 C 70 34, 80 46, 82 58 C 84 72, 77 90, 50 90 C 23 90, 16 72, 18 58 C 20 46, 30 34, 38 18 C 43 11, 47 5, 50 2 Z" fill="url(#rakEdgeGrad)" opacity="0.5"/>' +
                '<path class="rak-svg-spec" d="M 47 9 C 51 9, 54 13, 56 19 C 58 25, 56 31, 52 35 C 47 39, 43 35, 40 29 C 38 23, 40 17, 43 13 C 44 10, 46 9, 47 9 Z" fill="url(#rakSpecGrad)"/>' +
                '<path class="rak-svg-spec-2" d="M 38 60 C 42 58, 48 56, 54 58 C 58 60, 60 64, 58 68 C 56 72, 50 74, 44 72 C 40 70, 36 65, 38 60 Z" fill="url(#rakSpecGrad2)"/>' +
                '<g class="rak-plus-welcome">' +
                  '<rect x="45" y="36" width="10" height="28" rx="2.5" fill="rgba(255,255,255,0.85)" filter="url(#rakSvgShadow)"/>' +
                  '<rect x="36" y="45" width="28" height="10" rx="2.5" fill="rgba(255,255,255,0.85)" filter="url(#rakSvgShadow)"/>' +
                  '<rect x="45" y="36" width="10" height="28" rx="2.5" fill="rgba(255,255,255,0.15)" />' +
                  '<rect x="36" y="45" width="28" height="10" rx="2.5" fill="rgba(255,255,255,0.15)" />' +
                '</g>' +
                '<ellipse class="rak-svg-bubble b1" cx="34" cy="54" rx="3.5" ry="4.5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>' +
                '<ellipse class="rak-svg-bubble b2" cx="56" cy="72" rx="2.5" ry="3" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.01)" stroke-width="0.5"/>' +
                '<ellipse class="rak-svg-bubble b3" cx="42" cy="78" rx="2" ry="2.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.005)" stroke-width="0.5"/>' +
              '</svg>' +
            '</div>' +
            '</div>' +
            '<div class="rak-drop-particle p1"></div>' +
            '<div class="rak-drop-particle p2"></div>' +
            '<div class="rak-drop-particle p3"></div>' +
            '<div class="rak-drop-particle p4"></div>' +
            '<div class="rak-drop-particle p5"></div>' +
            '<div class="rak-drop-particle p6"></div>' +
            '<div class="rak-drip"></div>' +
          '</div>' +
          '<h2>Hello! I\'m Raktosathi</h2>' +
          '<p>Your personal blood donation assistant. Ask me anything about donation, eligibility, health tips, and more!</p>' +
          '<button class="rak-welcome-btn" id="rakWelcomeBtn">Start Chatting</button>' +
        '</div>' +

        /* ── FAQ OVERLAY PANEL ── */
        '<div class="rak-faq-overlay" id="rakFaqOverlay">' +
          '<div class="rak-faq-header">' +
            '<button class="rak-faq-back" id="rakFaqBack" title="Back to Chat">\u2190</button>' +
            '<h3>FAQs</h3>' +
            '<span class="rak-faq-count" id="rakFaqCount">0</span>' +
            '<button class="rak-faq-max-btn" id="rakFaqMaxBtn" title="Fullscreen">' + SVG_MAXIMIZE + '</button>' +
          '</div>' +
          '<div class="rak-faq-search-wrap">' +
            '<span class="rak-faq-search-icon">\uD83D\uDD0D</span>' +
            '<input type="text" class="rak-faq-search-input" id="rakFaqSearch" placeholder="Search questions..." autocomplete="off">' +
            '<button class="rak-faq-search-clear" id="rakFaqClear">\u2715</button>' +
          '</div>' +
          '<div class="rak-faq-categories" id="rakFaqCategories"></div>' +
          '<div class="rak-faq-list" id="rakFaqList"></div>' +
        '</div>' +

      '</div>' +

      '<div id="rak-bubble" class="entering">' +
        '<div class="rak-bubble-glow"></div>' +
        '<div class="rak-ring-1"></div>' +
        '<div class="rak-ring-2"></div>' +
        '<div class="rak-ring-3"></div>' +
        '<div class="rak-orbit-ring"></div>' +
        '<div class="rak-orbit-ring-2"></div>' +
        '<div class="rak-sparkle"></div>' +
        '<div class="rak-sparkle"></div>' +
        '<div class="rak-sparkle"></div>' +
        '<div class="rak-sparkle"></div>' +
        '<div class="rak-bubble-icon">' + SVG_DROP + '</div>' +
        '<div class="rak-tooltip">Chat with Raktosathi</div>' +
        '<div id="rak-badge">!</div>' +
      '</div>';

    document.body.appendChild(wrapper);

    els.bubble = $('rak-bubble');
    els.panel = $('rak-panel');
    els.messages = $('rakMessages');
    els.input = $('rakInput');
    els.sendBtn = $('rakSendBtn');
    els.maxBtn = $('rakMaximizeBtn');
    els.closeBtn = $('rakCloseBtn');
    els.scrollBtn = $('rakScrollBtn');
    els.inputArea = $('rakInputArea');
    els.suggestions = $('rakSuggestions');
    els.welcome = $('rakWelcome');
    els.welcomeBtn = $('rakWelcomeBtn');
    els.badge = $('rak-badge');
    els.guestSignIn = $('rakGuestSignIn');
    els.faqBtn = $('rakFaqBtn');
    els.faqOverlay = $('rakFaqOverlay');
    els.faqSearch = $('rakFaqSearch');
    els.faqCategories = $('rakFaqCategories');
    els.faqList = $('rakFaqList');
    els.faqBack = $('rakFaqBack');
    els.faqClear = $('rakFaqClear');
    els.faqCount = $('rakFaqCount');
    els.faqMaxBtn = $('rakFaqMaxBtn');

    setTimeout(function () {
      var b = $('rak-bubble');
      if (b) b.classList.remove('entering');
    }, 800);
  }

  /* ========================================================
     HELPERS
  ======================================================== */
  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function formatTime(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  /* ========================================================
     DRAGGING
  ======================================================== */
  function initDrag() {
    if (isMobile()) return;
    els.bubble.addEventListener('mousedown', onBubbleDragStart);
    els.bubble.addEventListener('touchstart', onBubbleDragStart, { passive: false });
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
    initPanelDrag();
  }

  function initPanelDrag() {
    if (isMobile()) return;
    var p = els.panel;
    if (!p || p._rakPanelDrag) return;
    p._rakPanelDrag = true;
    p.addEventListener('mousedown', onPanelDragStart);
    p.addEventListener('touchstart', onPanelDragStart, { passive: false });
  }

  function getWrapperRect() {
    var w = $('raktosathi-wrapper');
    if (!w) return null;
    return w.getBoundingClientRect();
  }

  function dragStartCommon(e) {
    var p = e.type === 'touchstart' ? e.touches[0] : e;
    state.isDragging = true;
    state.wasDragged = false;
    state.dragStartX = p.clientX;
    state.dragStartY = p.clientY;
    var rect = getWrapperRect();
    if (!rect) return;
    state.originX = rect.left;
    state.originY = rect.top;
    var w = $('raktosathi-wrapper');
    if (w) w.style.transition = 'none';
  }

  function onBubbleDragStart(e) {
    if (state.isOpen) return;
    dragStartCommon(e);
    if (state.isDragging) els.bubble.style.cursor = 'grabbing';
  }

  function onPanelDragStart(e) {
    if (!state.isOpen) return;
    if (els.panel && els.panel.classList.contains('rak-fullscreen')) return;
    if (e.target.closest('.rak-header-actions, .rak-header-btn')) return;
    if (e.target.closest('.rak-msg-bubble, #rakInput')) return;
    dragStartCommon(e);
    els.bubble.style.cursor = 'grabbing';
  }

  function onDragMove(e) {
    if (!state.isDragging) return;
    var p = e.type === 'touchmove' ? e.touches[0] : e;
    var dx = p.clientX - state.dragStartX;
    var dy = p.clientY - state.dragStartY;
    if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;
    if (!state.wasDragged) {
      state.wasDragged = true;
      document.body.classList.add('rak-dragging');
    }
    e.preventDefault();
    var size = state.isOpen
      ? 0
      : (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--rak-bubble-size')) || 64);
    var newX = Math.max(0, Math.min(window.innerWidth - size, state.originX + dx));
    var newY = Math.max(0, Math.min(window.innerHeight - size, state.originY + dy));
    state.bubbleX = newX;
    state.bubbleY = newY;
    var wrapper = $('raktosathi-wrapper');
    if (!wrapper) return;
    wrapper.style.left = newX + 'px';
    wrapper.style.top = newY + 'px';
    wrapper.style.right = 'auto';
    wrapper.style.bottom = 'auto';
  }

  function onDragEnd() {
    if (!state.isDragging) return;
    state.isDragging = false;
    document.body.classList.remove('rak-dragging');
    var wrapper = $('raktosathi-wrapper');
    if (wrapper) wrapper.style.transition = '';
    els.bubble.style.cursor = '';
  }

  /* ========================================================
     OPEN / CLOSE / MINIMIZE / MAXIMIZE
  ======================================================== */
  function toggleOpen() {
    if (state.isOpen) closePanel();
    else openPanel();
  }

  function openPanel() {
    if (state.isOpen) return;
    state.isOpen = true;

    if (state.faqOpen) closeFAQ();

    els.input.disabled = false;
    els.sendBtn.disabled = false;
    els.inputArea.style.display = '';
    els.suggestions.style.display = '';
    showGuestSignIn();

    if (state.firstOpen) {
      state.firstOpen = false;
      if (AUTH_MODE) {
        loadAuthHistory();
      } else {
        setTimeout(showWelcome, 200);
      }
    }
    setTimeout(function () { els.input.focus(); }, 300);
    if (!AUTH_MODE) restoreGuestMessages();

    els.panel.classList.add('open');
    els.bubble.style.opacity = '0';
    els.bubble.style.transform = 'scale(0.5)';
    els.badge.classList.remove('show');
  }

  function closePanel() {
    if (!state.isOpen) return;
    var wasMaximized = els.panel && els.panel.classList.contains('rak-fullscreen');
    if (wasMaximized) toggleMaximize();
    if (state.faqOpen) closeFAQ();
    state.isOpen = false;
    els.panel.classList.remove('open');
    els.bubble.style.opacity = '';
    els.bubble.style.transform = '';
    els.input.disabled = true;
    els.sendBtn.disabled = true;
    if (els.messages) els.messages.style.display = '';
    if (els.inputArea) els.inputArea.style.display = '';
    if (els.suggestions) els.suggestions.style.display = '';
  }

  function toggleMaximize() {
    var p = els.panel;
    if (!p) return;
    var isFS = p.classList.toggle('rak-fullscreen');
    var title = isFS ? '\u2756 Exit Fullscreen' : 'Fullscreen';
    if (els.maxBtn) els.maxBtn.title = title;
    if (els.faqMaxBtn) els.faqMaxBtn.title = title;
    if (isFS) {
      state._isMaximized = true;
      p.style.position = 'fixed';
      p.style.bottom = '0';
      p.style.right = '0';
      p.style.left = '0';
      p.style.top = '0';
      p.style.width = '100%';
      p.style.height = '100%';
      p.style.borderRadius = '0';
      p.style.border = 'none';
      p.style.boxShadow = 'none';
      document.body.style.overflow = 'hidden';
    } else {
      state._isMaximized = false;
      p.style.position = '';
      p.style.bottom = '';
      p.style.right = '';
      p.style.left = '';
      p.style.top = '';
      p.style.width = '';
      p.style.height = '';
      p.style.borderRadius = '';
      p.style.border = '';
      p.style.boxShadow = '';
      document.body.style.overflow = '';
    }
  }

  /* ========================================================
     FAQ SYSTEM
  ======================================================== */
  function toggleFAQ() {
    if (state.faqOpen) closeFAQ(); else openFAQ();
  }
  function openFAQ() {
    if (state.faqOpen) return;
    state.faqOpen = true;
    var o = els.faqOverlay;
    if (!o) return;
    o.classList.add('open');
    renderFAQCategories();
    renderFAQList(FAQ_DATA);
    if (els.faqSearch) { els.faqSearch.value = ''; els.faqSearch.focus(); }
    if (els.faqClear) els.faqClear.classList.remove('show');
    updateFAQCount();
    if (els.panel) els.panel.classList.add('rak-faq-active');
  }
  function closeFAQ() {
    if (!state.faqOpen) return;
    state.faqOpen = false;
    var o = els.faqOverlay;
    if (!o) return;
    o.classList.remove('open');
    if (els.panel) els.panel.classList.remove('rak-faq-active');
    if (els.input) els.input.focus();
  }
  function renderFAQCategories() {
    var c = els.faqCategories;
    if (!c) return;
    var html = '<button class="rak-faq-cat active" data-cat="all"><span class="cat-icon">\u2B50</span> All</button>';
    FAQ_DATA.forEach(function(cat, i) {
      html += '<button class="rak-faq-cat" data-cat="' + i + '"><span class="cat-icon">' + cat.icon + '</span> ' + cat.category + '</button>';
    });
    c.innerHTML = html;
    c.addEventListener('click', function(e) {
      var btn = e.target.closest('.rak-faq-cat');
      if (!btn) return;
      c.querySelectorAll('.rak-faq-cat').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      filterFAQ(btn.getAttribute('data-cat'));
    });
  }
  var _currentFaqFilter = 'all';
  function filterFAQ(cat) {
    _currentFaqFilter = cat;
    if (cat === 'all') renderFAQList(FAQ_DATA);
    else {
      var idx = parseInt(cat);
      if (!isNaN(idx) && FAQ_DATA[idx]) renderFAQList([FAQ_DATA[idx]]);
    }
    updateFAQCount();
  }
  function searchFAQ(query) {
    var q = query.toLowerCase().trim();
    if (!q) {
      if (_currentFaqFilter === 'all') renderFAQList(FAQ_DATA);
      else {
        var idx = parseInt(_currentFaqFilter);
        if (!isNaN(idx) && FAQ_DATA[idx]) renderFAQList([FAQ_DATA[idx]]);
      }
      if (els.faqClear) els.faqClear.classList.remove('show');
      return;
    }
    if (els.faqClear) els.faqClear.classList.add('show');
    var results = [];
    FAQ_DATA.forEach(function(cat) {
      var matchingItems = cat.items.filter(function(item) {
        return item.q.toLowerCase().indexOf(q) !== -1 || item.a.toLowerCase().indexOf(q) !== -1;
      });
      if (matchingItems.length > 0) {
        results.push({ category: cat.category, icon: cat.icon, items: matchingItems });
      }
    });
    renderFAQList(results);
    updateFAQCount(results);
  }
  function renderFAQList(data) {
    var list = els.faqList;
    if (!list) return;
    if (!data || data.length === 0) {
      list.innerHTML = '<div class="rak-faq-empty"><div class="rak-faq-empty-icon">\uD83D\uDD0D</div><div class="rak-faq-empty-text">No matching questions found</div><div class="rak-faq-empty-sub">Try a different search term or category</div></div>';
      return;
    }
    var html = '';
    data.forEach(function(cat) {
      if (cat.items && cat.items.length > 0) {
        html += '<div class="rak-faq-section-title">' + cat.icon + ' ' + cat.category + '</div>';
        cat.items.forEach(function(item) {
          html += '<div class="rak-faq-item" data-q="' + escAttr(item.q) + '" data-a="' + escAttr(item.a) + '">';
          html += '<div class="rak-faq-question"><span class="rak-faq-q-icon">\u2753</span><span>' + esc(item.q) + '</span><span class="rak-faq-chevron">\u25BC</span></div>';
          html += '<div class="rak-faq-answer-wrap"><div class="rak-faq-answer">' + faqFormatAnswer(item.a) + '</div>';
          html += '<div style="padding:0 14px 14px 52px;"><button class="rak-faq-answer-btn" data-action="send">\uD83D\uDCAC Ask in Chat</button></div></div></div>';
        });
      }
    });
    list.innerHTML = html;
    setupFAQAccordion();
  }
  function escAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function faqFormatAnswer(str) {
    if (!str) return '';
    return str.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  }
  function setupFAQAccordion() {
    var list = els.faqList;
    if (!list || list._faqSetup) return;
    list._faqSetup = true;
    list.addEventListener('click', function(e) {
      var item = e.target.closest('.rak-faq-item');
      if (!item) return;
      if (e.target.closest('[data-action="send"]')) { sendFAQToChat(item); return; }
      var isOpen = item.classList.contains('open');
      closeAllFAQItems();
      if (!isOpen) {
        item.classList.add('open');
        var wrap = item.querySelector('.rak-faq-answer-wrap');
        if (wrap) wrap.style.maxHeight = wrap.scrollHeight + 30 + 'px';
      }
    });
  }
  function closeAllFAQItems() {
    var list = els.faqList;
    if (!list) return;
    list.querySelectorAll('.rak-faq-item.open').forEach(function(i) {
      i.classList.remove('open');
      var wrap = i.querySelector('.rak-faq-answer-wrap');
      if (wrap) wrap.style.maxHeight = '0';
    });
  }
  function sendFAQToChat(item) {
    if (!item) return;
    var question = item.getAttribute('data-q');
    if (!question) return;
    item.classList.add('sending');
    closeFAQ();
    setTimeout(function() {
      sendAIMessage(question);
    }, 400);
  }
  function updateFAQCount(data) {
    var el = els.faqCount;
    if (!el) return;
    var total = 0;
    (data || FAQ_DATA).forEach(function(cat) { if (cat.items) total += cat.items.length; });
    el.textContent = total + ' Q';
  }

  /* ========================================================
     WELCOME
  ======================================================== */
  function showWelcome() {
    var w = els.welcome;
    if (!w) return;
    w.classList.add('show');
  }

  function hideWelcome() {
    var w = els.welcome;
    if (!w) return;
    w.classList.remove('show');
  }

  /* ========================================================
     GUEST SIGN-IN BADGE (always visible, always guest mode)
  ======================================================== */
  function showGuestSignIn() {
    if (AUTH_MODE) {
      if (els.guestSignIn) els.guestSignIn.style.display = 'none';
      return;
    }
    if (els.guestSignIn) {
      els.guestSignIn.style.display = '';
      els.guestSignIn.title = 'Sign in for permanent chat history';
    }
  }

  /* ========================================================
     MESSAGES
  ======================================================== */
  function appendMessage(sender, text, animate) {
    var c = els.messages;
    if (!c) return;
    var div = document.createElement('div');
    div.className = 'rak-msg ' + sender;
    var t = formatTime(new Date());
    var formatted = formatMsg(text);
    div.innerHTML = '<div class="rak-msg-bubble">' + formatted + '</div><div class="rak-msg-time">' + t + '</div>';
    if (animate !== false) {
      div.style.animation = 'none';
      c.appendChild(div);
      requestAnimationFrame(function () {
        div.style.animation = '';
      });
    } else {
      c.appendChild(div);
    }
    c.scrollTop = c.scrollHeight;
    msgCount++;
  }

  function formatMsg(text) {
    if (!text) return '';
    var s = esc(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    s = s.replace(/\*(.+?)\*/g, '<i>$1</i>');
    s = s.replace(/`(.+?)`/g, '<code style="background:rgba(192,22,44,0.12);padding:2px 5px;border-radius:4px;font-family:monospace;font-size:.8rem;">$1</code>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  /* ========================================================
     TYPING INDICATOR
  ======================================================== */
  function showTyping() {
    hideTyping();
    var c = els.messages;
    if (!c) return;
    var div = document.createElement('div');
    div.id = 'rakTyping';
    div.className = 'rak-msg bot';
    div.innerHTML = '<div class="rak-msg-bubble rak-typing"><span></span><span></span><span></span></div>';
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
  }

  function hideTyping() {
    var el = $('rakTyping');
    if (el) el.remove();
  }

  function scrollToBottom() {
    var c = els.messages;
    if (c) c.scrollTop = c.scrollHeight;
  }

  /* ========================================================
     GUEST SESSIONSTORAGE — only used for guest (non-auth) mode.
     Auth mode uses DB via chat_api.php.
  ======================================================== */
  function saveGuestMessages() {
    var c = els.messages;
    if (!c) return;
    var msgEls = c.querySelectorAll('.rak-msg');
    var messages = [];
    msgEls.forEach(function (el) {
      var bubble = el.querySelector('.rak-msg-bubble');
      var timeEl = el.querySelector('.rak-msg-time');
      messages.push({
        sender: el.classList.contains('user') ? 'user' : 'bot',
        text: bubble ? bubble.innerHTML : '',
        time: timeEl ? timeEl.textContent : '',
      });
    });
    try {
      sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {}
  }

  function restoreGuestMessages() {
    try {
      var data = sessionStorage.getItem(GUEST_STORAGE_KEY);
      if (!data) return;
      var messages = JSON.parse(data);
      if (!messages || !messages.length) return;
      els.messages.innerHTML = '<button class="rak-scroll-btn" id="rakScrollBtn">\u2193</button>';
      els.scrollBtn = $('rakScrollBtn');
      messages.forEach(function (m) {
        var div = document.createElement('div');
        div.className = 'rak-msg ' + m.sender;
        div.innerHTML = '<div class="rak-msg-bubble">' + m.text + '</div><div class="rak-msg-time">' + esc(m.time) + '</div>';
        els.messages.appendChild(div);
      });
      setupScrollBtn();
      requestAnimationFrame(function () {
        els.messages.scrollTop = els.messages.scrollHeight;
      });
      msgCount = messages.length;
    } catch (e) {}
  }

  /* ========================================================
     AUTH HISTORY — load from database for authenticated users
  ======================================================== */
  function loadAuthHistory() {
    if (authHistoryLoaded) return;
    authHistoryLoaded = true;
    fetch(AUTH_API + '?action=chatbot_history&session_id=' + encodeURIComponent(authSessionId || 'CHAT-0'))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.success || !d.history || !d.history.length) {
          setTimeout(showWelcome, 200);
          return;
        }
        hideWelcome();
        els.messages.innerHTML = '<button class="rak-scroll-btn" id="rakScrollBtn">\u2193</button>';
        els.scrollBtn = $('rakScrollBtn');
        d.history.forEach(function (m) {
          var div = document.createElement('div');
          div.className = 'rak-msg ' + (m.sender === 'bot' ? 'bot' : 'user');
          var formatted = formatMsg(m.message);
          var time = m.created_at ? formatTime(new Date(m.created_at)) : '';
          div.innerHTML = '<div class="rak-msg-bubble">' + formatted + '</div><div class="rak-msg-time">' + esc(time) + '</div>';
          els.messages.appendChild(div);
        });
        setupScrollBtn();
        requestAnimationFrame(function () {
          els.messages.scrollTop = els.messages.scrollHeight;
        });
        msgCount = d.history.length;
      })
      .catch(function () {
        setTimeout(showWelcome, 200);
      });
  }

  /* ========================================================
     SEND MESSAGE — guest_chat_api.php (guest) or chat_api.php (auth)
  ======================================================== */
  function sendAIMessage(msg) {
    if (!msg) return;

    appendMessage('user', msg);
    els.input.value = '';
    els.input.style.height = 'auto';
    els.input.focus();
    els.sendBtn.disabled = true;
    scrollToBottom();
    if (!AUTH_MODE) saveGuestMessages();

    showTyping();

    var url, payload;
    if (AUTH_MODE) {
      url = AUTH_API + '?action=chatbot_message';
      payload = { message: msg, session_id: authSessionId };
    } else {
      url = 'guest_chat_api.php?action=guest_chatbot';
      payload = { message: msg, context: getGuestContext() };
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        hideTyping();
        var botMsg = d.response || "Hi! I'm Raktosathi, your Blood Companion \uD83D\uDCB8. I can answer questions about blood donation, eligibility, health tips, and more.";
        var delay = Math.min(400 + botMsg.length * 2, 1800);
        setTimeout(function () {
          appendMessage('bot', botMsg);
          scrollToBottom();
          if (!AUTH_MODE) saveGuestMessages();
        }, delay);
      })
      .catch(function () {
        hideTyping();
        appendMessage('bot', "I'm having trouble connecting. Please try again later.");
        scrollToBottom();
        if (!AUTH_MODE) saveGuestMessages();
      })
      .finally(function () {
        els.sendBtn.disabled = false;
      });
  }

  function sendMessage() {
    var msg = els.input.value.trim();
    sendAIMessage(msg);
  }

  function getGuestContext() {
    try {
      var data = sessionStorage.getItem(GUEST_STORAGE_KEY);
      if (!data) return [];
      var msgs = JSON.parse(data);
      var ctx = [];
      msgs.forEach(function (m) {
        ctx.push({ sender: m.sender, message: stripHtml(m.text) });
      });
      return ctx.slice(-8);
    } catch (e) {
      return [];
    }
  }

  function stripHtml(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || d.innerText || '';
  }

  /* ========================================================
     SUGGESTIONS
  ======================================================== */
  var SUGGESTIONS = [
    { text: '\u2753 Who can donate?', msg: 'Who can donate blood?', },
    { text: '\uD83D\uDCCB How to donate?', msg: 'How does blood donation work?' },
    { text: '\uD83C\uDF4E What to eat?', msg: 'What should I eat before donating blood?' },
    { text: '\uD83D\uDCB8 Eligibility?', msg: 'Can I donate blood? Tell me about eligibility.' },
    { text: '\u2764\uFE0F Is it safe?', msg: 'Is blood donation safe?' },
    { text: '\uD83D\uDE30 Scared of needles', msg: "I'm scared of needles. Any tips?" },
  ];

  function renderSuggestions() {
    var c = els.suggestions;
    if (!c) return;
    c.innerHTML = '';
    SUGGESTIONS.forEach(function (s) {
      var btn = document.createElement('button');
      btn.className = 'rak-chip';
      btn.textContent = s.text;
      btn.addEventListener('click', function () {
        els.input.value = s.msg;
        sendMessage();
      });
      c.appendChild(btn);
    });
  }

  /* ========================================================
     SCROLL BUTTON
  ======================================================== */
  function setupScrollBtn() {
    var c = els.messages;
    var btn = els.scrollBtn;
    if (!c || !btn) return;
    if (c._rakScrollSetup) return;
    c.addEventListener('scroll', function () {
      var nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
      btn.style.display = nearBottom ? 'none' : 'flex';
    });
    btn.addEventListener('click', function () {
      c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
      btn.style.display = 'none';
    });
    c._rakScrollSetup = true;
  }

  /* ========================================================
     BUBBLE CLICK
  ======================================================== */
  function initBubbleClick() {
    var b = els.bubble;
    if (!b) return;
    b.addEventListener('click', function (e) {
      if (state.wasDragged) { state.wasDragged = false; return; }
      toggleOpen();
    });
  }

  /* ========================================================
     BUTTON EVENTS
  ======================================================== */
  function initButtons() {
    if (els.closeBtn) els.closeBtn.addEventListener('click', closePanel);
    if (els.maxBtn) els.maxBtn.addEventListener('click', toggleMaximize);
    if (els.faqBtn) {
      els.faqBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleFAQ();
      });
    }
    if (els.faqBack) {
      els.faqBack.addEventListener('click', function(e) {
        e.stopPropagation();
        closeFAQ();
      });
    }
    if (els.faqMaxBtn) {
      els.faqMaxBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMaximize();
      });
    }
    if (els.faqSearch) {
      els.faqSearch.addEventListener('input', function() {
        searchFAQ(this.value);
      });
      els.faqSearch.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeFAQ();
      });
    }
    if (els.faqClear) {
      els.faqClear.addEventListener('click', function() {
        els.faqSearch.value = '';
        searchFAQ('');
        els.faqSearch.focus();
      });
    }
    if (els.sendBtn) els.sendBtn.addEventListener('click', sendMessage);
    if (els.guestSignIn) {
      els.guestSignIn.addEventListener('click', function () {
        window.location.href = 'login.html';
      });
    }
    if (els.input) {
      els.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      els.input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
      });
    }
    if (els.welcomeBtn) {
      els.welcomeBtn.addEventListener('click', function () {
        hideWelcome();
        els.input.focus();
      });
    }
  }

  /* ========================================================
     OUTSIDE CLICK
  ======================================================== */
  function initOutsideClick() {
    document.addEventListener('click', function (e) {
      var w = $('raktosathi-wrapper');
      if (!w) return;
      if (state.isOpen && !w.contains(e.target)) {
        closePanel();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (state.isOpen) closePanel();
      }
    });
  }

  /* ========================================================
     PREVENT BUBBLE CLOSE WHEN CLICKING INSIDE PANEL
  ======================================================== */
  function initPanelClick() {
    var p = els.panel;
    if (!p) return;
    p.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  /* ========================================================
     INIT
  ======================================================== */
  function init() {
    if (window._raktosathiInited) return;
    window._raktosathiInited = true;

    insertChat();
    if (!els.bubble) return;

    initBubbleClick();
    initDrag();
    initButtons();
    initOutsideClick();
    initPanelClick();
    renderSuggestions();
    setupScrollBtn();
    updateBadge();
  }

  /* ========================================================
     BADGE
  ======================================================== */
  function updateBadge() {
    var b = els.badge;
    if (!b) return;
    if (!state.isOpen) {
      b.textContent = '!';
      b.classList.add('show');
    } else {
      b.classList.remove('show');
    }
  }

  /* ========================================================
     START
  ======================================================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
