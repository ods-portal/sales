# DSR CMS — Product Requirements Document (PRD)

**Product ka naam:** DSR CMS (Daily Sales Report)  
**Simple mein kya hai yeh:** Field sales team ke liye ek online register / office diary jahan doctors ki details, daily visits, follow-ups, reports aur team management sab ek jagah milta hai.  
**Language:** Hinglish — taaki non-tech log bhi easily samajh sakein.  
**Version note:** Yeh document actual app pages aur flows ke hisaab se likha gaya hai.

---

## 1. Yeh app kis problem ko solve karti hai?

Sales team roz clinics / doctors ke paas jaati hai. Pehle yeh cheezein notebook, WhatsApp ya Excel mein bikhar jaati thin:

- Kaunsa doctor milna tha?
- Meeting mein kya baat hui?
- Agli follow-up kab hai?
- Kaunsi visit pending / late pad gayi?
- Manager ko team ka overall picture nahi milta tha

**DSR CMS** yeh sab ek saath organise karti hai — jaise ek smart sales office jahan har cheez search, filter, track aur report ho sakti hai.

**Tagline (login pe):** *Track Every Visit. Grow Every Relationship.*

---

## 2. Kaun kaun use karega? (3 roles)

App mein 3 tarah ke users hain. Socho jaise company ke 3 levels:

| Role | Simple samajh | Kya kar sakte hain (short) |
|------|---------------|----------------------------|
| **Sales Person** | Field mein doctor visit karne wala | Sirf apne doctors aur apni visits. Naya doctor add, visit log, status update. Reports / users / audit nahi. |
| **Admin (bina Write Access)** | Manager jo mostly dekhna chahta hai | Sab records dekh sakta hai, visit/doctor add kar sakta hai, lekin edit-delete / reports / users / cron locked. |
| **Admin (Write Access ke saath)** | Manager jise control diya gaya | Reports, users, dropdowns, cron, doctor/visit edit-delete, reschedule — almost full team control. |
| **Super Admin** | Company ka top boss / system owner | Upar sab + **Audit Trail** (kaunne kya change kiya). |

### Simple permission picture

- Sales = apna territory  
- Admin (read) = dekhna + basic logging  
- Admin (write) = team chalana  
- Super Admin = sab kuch + history / security check

---

## 3. App ka overall flow (A → Z journey)

```
Login
  ↓
Dashboard (aaj ka overview)
  ↓
Doctors manage karo  ↔  Visits log karo
  ↓
Pending / Overdue alerts dekho
  ↓
(Admin) Reports nikaalo, users manage karo, dropdowns set karo
  ↓
(Super Admin) Audit trail se check karo
  ↓
Settings se apna naam / password update
```

**Roz ka typical din (Sales Person):**
1. Login  
2. Dashboard pe overdue / pending dekho  
3. Clinic visit karo  
4. **Log New Visit** bharo (summary + next follow-up)  
5. Agar follow-up late hai → Alerts se open karke follow-up visit log karo  
6. Kabhi naya doctor mila → **Add New Doctor**

**Manager ka typical din:**
1. Dashboard pe team numbers  
2. Reports se daily/weekly/monthly export  
3. Overdue list check  
4. Zarurat pade to visit reschedule / user block / dropdown update

---

## 4. Har page A to Z — kya hai, kya karta hai

Neeche **har screen** simple language mein. Technical words kam, matlab clear.

---

### 4.1 Home `/` — Seedha redirect

Yeh koi alag page nahi dikhta.  
- Login kiye ho → seedha **Dashboard**  
- Nahi kiye → **Login**

---

### 4.2 Login `/login` — App ka gate

**Kaun:** Jo bhi account rakhta hai  
**Kya dikhta hai:** Email + password, password show/hide  
**Kya hota hai:** Sahi details se andar; galat pe error  
**Note:** “Forgot password” abhi placeholder hai (kaam nahi karta)  
**Baad mein:** 7 din tak logged-in reh sakte ho (cookie)

---

### 4.3 Dashboard Overview `/dashboard` — Pehli nazar ka control room

**Kaun:** Sab logged-in users (Sales ko sirf apna data)  
**Purpose:** Ek screen pe samajh jao — kitna kaam hua, kya pending, kya late

#### Dashboard pe kya-kya dikhta hai (widgets / actions)

| Cheez | Simple matlab | User kya kar sakta hai |
|-------|---------------|------------------------|
| **Total Doctors** | Kitne doctors aapke scope mein | Sirf dekhna |
| **Visits This Month** | Is mahine kitni visits | Sirf dekhna |
| **Pending Follow-ups** | Aane wali pending follow-ups | Sirf dekhna |
| **Overdue** | Jo follow-up date nikal gayi | Sirf dekhna |
| **Conversion Rate** | Kitne doctors pe kam se kam 1 completed visit ho chuki | Sirf dekhna |
| **Visit Trend chart** | Last 7 / 14 / 30 din ki visit line | Range buttons se change |
| **Doctor Categories pie** | A / B / C / D doctors ka hissa | Sirf dekhna |
| **Recent Visits** | Last kuch visits | Visit pe click → detail; “View all” → All Visits |
| **Overdue Follow-ups list** | Late wali list | Visit pe click; “View all” → Alerts |
| **Log New Visit button** | Nayi visit daalne ka shortcut | `/visits/new` pe le jaata hai |

**Ek line mein:** Dashboard = “aaj mujhe kya dekhna chahiye?” ka answer.

---

### 4.4 All Doctors `/doctors` — Doctor directory

**Kaun:** Sab (Sales = sirf assigned doctors)  
**Purpose:** Saare doctors ki list — phone book + CRM jaisi

**Actions:**
- Search (naam / details)
- Filter (category, status)
- Sort columns
- Page by page dekhna
- Doctor open karke profile dekhna
- **Add New Doctor**
- Edit / Delete — sirf Write Admin / Super Admin

**Sales ke liye note:** Unhe “Assigned Rep” column nahi dikhta (kyunki woh khud rep hain).

---

### 4.5 Add New Doctor `/doctors/new` — Naya doctor register (7 steps)

**Kaun:** Sab roles create kar sakte hain  
**Sales:** Automatically wohi assigned rep ban jaata hai  
**Admin/Super Admin:** Assigned rep choose kar sakte hain

**7 steps (wizard):**

1. **Information** — naam, contact, basic identity  
2. **Practice Profile** — clinic / practice details, volume wagaira  
3. **Categorization** — category A–D, status, speciality  
4. **Opportunity Tracking** — kitna business potential  
5. **Competitor Info** — dusre brands / systems ki info  
6. **Attachments** — clinic photo, visiting card, doctor photo (consent ke saath), documents upload  
7. **Additional Info** — birthday, communication preference, extra notes  

**End:** Submit → doctor list mein add

---

### 4.6 Doctor Profile `/doctors/[slug]` — Ek doctor ki full file

**Kaun:** Sab (Sales sirf apne assigned)  
**Purpose:** Us doctor ki poori story ek jagah

**Tabs / sections (dekhne ke liye):**
- Profile
- Practice
- Category
- Opportunity
- Competitor
- Attachments
- Additional
- Visit History

**Actions:**
- Call / email links
- **Log Visit** (usi doctor ke liye)
- **Edit** — sirf Write Admin / Super Admin

---

### 4.7 Edit Doctor `/doctors/[slug]/edit`

**Kaun:** Super Admin ya Write Access wala Admin  
**Kya:** Same 7-step form, update karke save

---

### 4.8 All Visits `/visits` — Daily sales visit register

**Kaun:** Sab (Sales = apni visits)  
**Purpose:** Field meetings ka master list

**Status chips (filters):**
- All
- Pending
- Overdue
- Completed
- Cancelled

**Extra nav shortcut:** **Pending Visits** = same page with Pending filter

**Actions:**
- Search, sort, paginate
- Visit detail open
- Status → Completed / Cancelled (Sales apni; Write Admin/Super Admin broader)
- Delete — Write Admin / Super Admin
- **Log New Visit**

---

### 4.9 Log New Visit `/visits/new` — Field visit entry (5 steps)

**Kaun:** Sab  
**Optional:** Doctor pehle se select ho sakta hai (`?doctor=...`)

**5 steps:**

1. **Basic Details** — doctor, date, visit type, mode  
2. **Discussion** — meeting summary (**minimum 500 characters** — thoda detail likhna zaroori)  
3. **Follow-up & Actions** — agli date, next action, responsible person  
4. **Deliverables & Cases** — sample kit / demo / cases related toggles & info  
5. **Attachments & Rating** — photos upload + star rating  

**End:** Submit → visit list mein dikhegi, follow-up date se pending/overdue logic chalegi

---

### 4.10 Visit Detail `/visits/[slug]` — Ek visit ki poori diary page

**Kaun:** Sab (Sales apni)  
**Actions:**
- Poori visit details dekhna
- Status update (rules ke hisaab se)
- **Reschedule follow-up** — Write Admin / Super Admin, sirf Pending/Overdue pe; remarks kam se kam 10 letters; history save hoti hai
- Delete — Write Admin / Super Admin
- Reschedule history dekhna

---

### 4.11 Overdue Follow-ups `/alerts` — Late kaam ki list

**Kaun:** Sab (Sales scoped)  
**Purpose:** Jo follow-up date nikal gayi, unhe highlight karna

**Actions:**
- Overdue visits list
- Visit open
- **Log Follow-up** (usi doctor ke liye nayi visit)
- Agar 7 din se zyada late → critical highlight

**Simple:** Yeh “reminder board” hai — jo miss ho gaya.

---

### 4.12 Reports `/reports` — Sales reports + export

**Kaun:** Super Admin **ya** Write Access wala Admin (baaki redirect)  
**Purpose:** Manager / leadership ke liye performance nikaalna

**Report types:**
- Daily Sales Report
- Weekly Performance Report
- Monthly KPI Report
- Custom Range Report

**Filters:** Doctor, Sales Rep, date range  
**Output:** Screen pe preview + **CSV** / **HTML** export  

**Andar roughly kya milta hai:**
- KPIs
- Rep performance
- Status / type breakdown
- Visit tables

---

### 4.13 Dropdown Manager `/dropdowns` — Form ke options ka control room

**Kaun:** Admin + Super Admin (nav mein)  
**Edit:** Write chahiye; bina write → sirf dekhna

**Purpose:** App ke forms mein jo dropdowns aate hain (Visit Type, Speciality, Brand, etc.) unhe yahan se manage karo — code change ke bina.

**Examples of groups:**
- Visit Types, Meeting Modes, Next Actions  
- Specialities, Doctor Categories / Statuses  
- Aligner Brands, Ortho Systems  
- Decision Maker / Stage, Potential Rating  
- Preferred Communication, Patient Volume  
- Yes/No (system — locked, change nahi)

**Actions:** Options add / delete (non-system)

---

### 4.14 Cron Jobs `/admin/crons` — Auto email reminders

**Kaun:** Write Admin / Super Admin  
**Purpose:** System automatically emails bhejti hai; yahan se manually bhi chala sakte ho

**Do jobs:**
1. **Today visit reminder** — aaj jinki follow-up due hai, un reps ko mail  
2. **Missing yesterday visit** — kal jinhone koi visit log nahi ki, unhe mail  

**Scheduled:** Roz ~8:00 PM IST (server pe)  
**Page pe:** Manual run + last run results

**Non-tech line:** Yeh “auto peon” hai jo team ko email se yaad dilata hai.

---

### 4.15 Manage Users `/users` — Team accounts

**Kaun:** Write Admin / Super Admin  
**Actions:**
- Users search / list
- Naya user add (naam, email, role, password)
- Email edit
- Admin ko Write Access on/off
- Block / Unblock (suspend)
- Delete
- Khud ko manage nahi kar sakte; Admin dusre Super Admin ko nahi chhed sakta

---

### 4.16 Audit Trail `/audit` — Kaunne kya kiya (CCTV log)

**Kaun:** **Sirf Super Admin**  
**Purpose:** Security + accountability

**Dikhata hai:** CREATE / UPDATE / DELETE / LOGIN / PERMISSION_CHANGE wagaira — kaun, kab, kis cheez pe  
**Actions:** Filter + paginate + dekhna (read-only)

---

### 4.17 Settings / Profile `/settings` — Apna account

**Kaun:** Sab  
**Actions:**
- Display name update
- Password change (current + naya, naya kam se kam 8 letters)
- Email sirf dekhne ke liye (change yahan se nahi)

---

## 5. Sidebar menu map (jaise app mein dikhta hai)

| Section | Menu item | Page | Kisiko dikhe |
|---------|-----------|------|--------------|
| Dashboard | Overview | `/dashboard` | Sab |
| Dashboard | Reports | `/reports` | Write Admin / Super Admin |
| Doctor Management | All Doctors | `/doctors` | Sab |
| Doctor Management | Add New Doctor | `/doctors/new` | Sab |
| Visit Management | Log New Visit | `/visits/new` | Sab |
| Visit Management | All Visits | `/visits` | Sab |
| Visit Management | Pending Visits | `/visits?status=Pending` | Sab |
| Alerts & Compliance | Overdue Follow-ups | `/alerts` | Sab |
| Configuration | Dropdown Manager | `/dropdowns` | Admin / Super Admin |
| Configuration | Cron Jobs | `/admin/crons` | Write Admin / Super Admin |
| User Management | Manage Users | `/users` | Write Admin / Super Admin |
| User Management | Audit Trail | `/audit` | Super Admin only |
| Settings | Profile | `/settings` | Sab |

Neeche sidebar mein: user naam, role, **Logout**

---

## 6. Main business objects (simple relationships)

Socho teen notebooks:

1. **User** — login wale log (Sales / Admin / Super Admin)  
2. **Doctor** — clinics / doctors jinke saath relationship hai; har doctor ka **Assigned Sales Rep** hota hai  
3. **Visit** — doctor ke paas gaye / call kiya — uski entry; follow-up date, status, summary, rating  

```
Sales Rep ── assign ──► Doctors ── visits ──► Visits
                              ▲
                              └── same visit pe salesPerson bhi linked
```

**Extra notebooks:**
- **Dropdowns** — forms ke ready options  
- **Audit Log** — changes ka history  

**Industry flavor:** Clear aligners / ortho / dental clinics ke field sales ke liye bani hui feel (brands, cases, scanner demo, sample kits, visiting cards).

---

## 7. Role-wise “kya kar sakta / nahi” (easy matrix)

| Kaam | Sales | Admin (no write) | Admin (write) | Super Admin |
|------|-------|------------------|---------------|-------------|
| Login, Dashboard, Settings | Haan | Haan | Haan | Haan |
| Apne doctors / visits dekhna | Haan | Sab dekh | Sab | Sab |
| Doctor add / Visit log | Haan | Haan | Haan | Haan |
| Doctor edit / delete | Nahi | Nahi | Haan | Haan |
| Visit complete / cancel | Apni | Nahi* | Haan | Haan |
| Visit delete | Nahi | Nahi | Haan | Haan |
| Follow-up reschedule | Nahi | Nahi | Haan | Haan |
| Reports + export | Nahi | Nahi | Haan | Haan |
| Users manage | Nahi | Nahi | Haan | Haan |
| Dropdown edit | Nahi | Sirf dekh | Haan | Haan |
| Cron page | Nahi | Nahi | Haan | Haan |
| Audit Trail | Nahi | Nahi | Nahi | Haan |

\*Admin bina write ke core CRM dekh/add kar sakta hai, lekin sensitive admin actions band.

**Sales visit edit window:** Apni visit create ke ~24 hours ke andar limited edit (system rule).

---

## 8. End-to-end stories (non-tech scenarios)

### Story A — Sales Person “Rahul”
1. Subah login → Dashboard pe 3 overdue dikhe  
2. Alerts pe gaya → Doctor Sharma late  
3. Clinic gaya → Log New Visit (500+ letters summary + next date)  
4. Doctor list mein naya prospect mila → Add New Doctor (7 steps + visiting card photo)  
5. Shaam Settings se password change

### Story B — Write Admin “Priya”
1. Dashboard pe team conversion rate check  
2. Reports → Weekly → CSV download for meeting  
3. Ek visit galat date pe thi → Visit detail → Reschedule + remarks  
4. Naya sales join → Users → Add user  
5. Form mein naya Aligner Brand chahiye → Dropdown Manager → add option

### Story C — Super Admin
1. Audit Trail pe dekha — kisne doctor delete kiya  
2. Cron page pe “today reminder” manually run  
3. Ek Admin ko Write Access on kiya

---

## 9. Important rules (business / product)

1. Meeting summary short nahi — **minimum 500 characters** (quality reporting).  
2. Follow-up date miss → status Overdue + Alerts + emails.  
3. 7+ din overdue → critical feel UI pe.  
4. Photos / documents Firebase storage pe jaate hain.  
5. Sales ko sirf apna data — privacy / territory clean.  
6. Write Access toggle se Admin ka power control hota hai.  
7. System Yes/No dropdowns lock hain.  
8. Forgot password abhi product mein live feature nahi.  
9. Public marketing website nahi — entry point Login hai.

---

## 10. Success criteria (product sahi chal raha hai ya nahi)

App tab successful maani jayegi jab:

- Sales roz bina confusion ke visit log kar sake  
- Manager overdue 1 click mein dekh sake  
- Doctor ki full history (visits + attachments) mil sake  
- Weekly/monthly report export meeting-ready ho  
- Galat permissions se sensitive pages open na hon  
- Auto emails se “visit bhool gaye” wale cases kam hon  
- Super Admin ko har important change ka trail mile

---

## 11. Out of scope / abhi nahi (clear expectations)

- Public website / marketing landing  
- Working Forgot Password  
- Separate Orders / Products / Leads modules (yeh doctor+visit CRM hai)  
- Sidebar search box abhi decorative (full search wired nahi)

---

## 12. Page checklist (quick A–Z index)

| # | Page | One-line Hinglish |
|---|------|-------------------|
| 1 | `/` | Login ya Dashboard pe bhej deta hai |
| 2 | `/login` | Email-password se entry |
| 3 | `/dashboard` | Numbers, charts, recent + overdue overview |
| 4 | `/doctors` | Doctors ki searchable list |
| 5 | `/doctors/new` | 7-step doctor registration |
| 6 | `/doctors/[slug]` | Doctor ki full profile + history |
| 7 | `/doctors/[slug]/edit` | Doctor details update |
| 8 | `/visits` | Saari visits + status filters |
| 9 | `/visits?status=Pending` | Sirf pending visits |
| 10 | `/visits/new` | 5-step daily visit logging |
| 11 | `/visits/[slug]` | Visit detail + reschedule/delete |
| 12 | `/alerts` | Overdue follow-up action board |
| 13 | `/reports` | Daily/weekly/monthly/custom + export |
| 14 | `/dropdowns` | Form options manage |
| 15 | `/admin/crons` | Reminder emails run / monitor |
| 16 | `/users` | Team accounts + write access |
| 17 | `/audit` | Security / change history |
| 18 | `/settings` | Apna naam + password |

---

## 13. Closing summary (ek paragraph)

**DSR CMS** ek field sales portal hai jahan Sales Person doctors add karta hai aur daily visits detail ke saath log karta hai; Dashboard aur Alerts usko pending/overdue kaam dikhate hain; Admin Write Access se reports, users, dropdowns aur reminder emails control karta hai; Super Admin upar se Audit Trail se poori company ki activity check karta hai. Matlab — notebook + Excel + WhatsApp reminders ki jagah ek organised sales office, jo mobile/desktop dono pe chal sake.

---

*Document type: Product Requirements / Product Walkthrough*  
*Audience: Business, sales managers, ops, non-tech stakeholders*  
*Tone: Hinglish, zero jargon where possible*
