import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime, date

# --- 1. CONFIGURATION & ELITE THEME ---
st.set_page_config(page_title="PIHS Mardan Command Center", layout="wide")

SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black'; font-size: 32px; color: #FFD700;
        animation: blinker 1.5s linear infinite; text-align: center;
    }
    .gateway-master {
        background-color: #001d3d; padding: 25px; border-radius: 20px;
        border: 2px solid #FFD700; text-align: center; margin-bottom: 20px;
        box-shadow: 0px 10px 30px rgba(0,0,0,0.8);
    }
    .critical-alert {
        color: #ff4b4b; font-weight: bold; animation: blinker 1s linear infinite;
        background-color: rgba(255, 75, 75, 0.1); padding: 15px;
        border-radius: 10px; border: 1px solid red;
    }
    .stButton>button {
        width: 100%; border-radius: 12px; height: 3.5em;
        font-weight: bold; background-color: #28a745; color: white;
    }
    .sidebar-cal {
        background-color: #1b263b; padding: 15px; border-radius: 10px;
        border-top: 4px solid #1a73e8; text-align: center;
    }
    </style>
""", unsafe_allow_html=True)

# --- 2. BACKEND ENGINES ---
def get_service():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_data(range_name):
    try:
        service = get_service()
        result = service.spreadsheets().values().get(
            spreadsheetId=SHEET_ID, range=range_name
        ).execute()
        values = result.get('values', [])
        if not values:
            return pd.DataFrame()
        headers = [str(h).strip().title() for h in values[0]]
        return pd.DataFrame(values[1:], columns=headers)
    except Exception as e:
        st.warning(f"Sheet read error: {e}")
        return pd.DataFrame()

def sync_sheet(range_name, values, mode="append"):
    try:
        service = get_service()
        if mode == "append":
            service.spreadsheets().values().append(
                spreadsheetId=SHEET_ID, range=range_name,
                valueInputOption="RAW", body={'values': values}
            ).execute()
        else:
            service.spreadsheets().values().update(
                spreadsheetId=SHEET_ID, range=range_name,
                valueInputOption="RAW", body={'values': values}
            ).execute()
        return True
    except Exception as e:
        st.error(f"Sheet write error: {e}")
        return False

# --- 3. WELCOME GATEWAY ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.balloons()

st.markdown(
    '<div class="gateway-master">'
    '<div class="blinking-text">✦ WELCOME TO THE ✦</div>'
    '<h1 style="color:white; font-size:26px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>'
    '<p style="color:#FFD700; margin:0;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>'
    '</div>',
    unsafe_allow_html=True
)

# --- 4. AUTHENTICATION ---
if not st.session_state.logged_in:
    users_df = get_data("USERS_CREDENTIALS!A:F")
    cols = st.columns([1, 1.5, 1])

    with cols[1]:
        role = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'Faculty', 'Student'])

        if role in ['HOD', 'COORDINATOR', 'Faculty']:
            if role == 'Faculty' and not users_df.empty:
                fac_col = 'Full Name' if 'Full Name' in users_df.columns else users_df.columns[0]
                role_col = 'Role' if 'Role' in users_df.columns else users_df.columns[1]
                f_names = users_df[users_df[role_col] == 'Faculty'][fac_col].tolist()
                user_sel = st.selectbox("Select Your Name:", f_names) if f_names else st.text_input("Your Name")
            else:
                user_sel = role

            pwd = st.text_input("PASSWORD", type="password")

            if st.button("ENTER COMMAND CENTER"):
                if not users_df.empty:
                    name_col = 'Full Name' if 'Full Name' in users_df.columns else users_df.columns[0]
                    pass_col = 'Password' if 'Password' in users_df.columns else users_df.columns[2]
                    role_col = 'Role' if 'Role' in users_df.columns else users_df.columns[1]

                    if role == 'Faculty':
                        match = users_df[
                            (users_df[name_col] == user_sel) &
                            (users_df[pass_col] == pwd)
                        ]
                    else:
                        match = users_df[
                            (users_df[role_col] == role) &
                            (users_df[pass_col] == pwd)
                        ]

                    if not match.empty:
                        st.session_state.logged_in = True
                        st.session_state.user = match.iloc[0].to_dict()
                        st.session_state.user['Role'] = role
                        st.balloons()
                        st.rerun()
                    else:
                        st.error("❌ Incorrect Credentials. Please try again.")
                else:
                    st.error("❌ Could not load user data from Google Sheets.")

        elif role == 'Student':
            students_df = get_data("STUDENTS LIST!A:E")
            if not students_df.empty:
                name_col = students_df.columns[0]
                student_names = students_df[name_col].tolist()
                selected_student = st.selectbox("Select Your Name:", student_names)
            else:
                selected_student = st.text_input("Enter Your Name:")

            if st.button("OPEN STUDENT PORTAL (NO PASSWORD)"):
                st.session_state.logged_in = True
                st.session_state.user = {
                    'Role': 'Student',
                    'Full Name': selected_student
                }
                st.balloons()
                st.rerun()

# --- 5. LOGGED-IN INTERFACE ---
else:
    u = st.session_state.user
    role = u.get('Role', 'Student')

    # Sidebar
    with st.sidebar:
        now = datetime.now()
        st.markdown(
            f'<div class="sidebar-cal">'
            f'<h4 style="color:#FFD700; margin:0;">📅 SYSTEM DATE</h4>'
            f'<h2 style="color:white; margin:0;">{now.strftime("%d %b %Y")}</h2>'
            f'<p style="color:#1a73e8; margin:0;">{now.strftime("%A")}</p>'
            f'<p style="color:#aaa; margin:0; font-size:12px;">{now.strftime("%I:%M %p")}</p>'
            f'</div>',
            unsafe_allow_html=True
        )
        st.markdown("---")
        st.markdown(f"**Logged in as:** {u.get('Full Name', 'User')}")
        st.markdown(f"**Role:** `{role}`")
        if st.button("🚪 Logout"):
            st.session_state.logged_in = False
            st.rerun()

    # =========================================================
    # HOD & COORDINATOR DASHBOARD
    # =========================================================
    if role in ['HOD', 'COORDINATOR']:
        st.title(f"🛡️ {role} Command Dashboard")
        tabs = st.tabs(["📊 Analytics & Warning", "📝 Mark Attendance", "⚙️ Faculty Stall"])

        # --- TAB 1: Analytics & 75% Warning ---
        with tabs[0]:
            st.subheader("📊 Attendance Analytics & 75% Warning System")

            att_df = get_data("ATTENDANCE HISTORY!A:J")
            stu_df = get_data("STUDENTS LIST!A:E")

            if att_df.empty or stu_df.empty:
                st.info("ℹ️ No attendance data found. Please ensure Google Sheets has data.")
            else:
                # Try to identify columns
                try:
                    # Normalize column names
                    att_df.columns = [c.strip().title() for c in att_df.columns]
                    stu_df.columns = [c.strip().title() for c in stu_df.columns]

                    # Detect student name and status columns
                    student_col = [c for c in att_df.columns if 'student' in c.lower() or 'name' in c.lower()]
                    status_col  = [c for c in att_df.columns if 'status' in c.lower() or 'present' in c.lower() or 'attendance' in c.lower()]

                    if student_col and status_col:
                        scol = student_col[0]
                        stcol = status_col[0]

                        summary = att_df.groupby(scol)[stcol].apply(
                            lambda x: round((x.str.upper() == 'P').sum() / len(x) * 100, 1)
                        ).reset_index()
                        summary.columns = ['Student Name', 'Attendance %']

                        # Merge with student list to get Father Name
                        if 'Father Name' in stu_df.columns or any('father' in c.lower() for c in stu_df.columns):
                            fname_col = [c for c in stu_df.columns if 'father' in c.lower()]
                            sname_col = [c for c in stu_df.columns if 'name' in c.lower() and 'father' not in c.lower()]
                            if fname_col and sname_col:
                                summary = summary.merge(
                                    stu_df[[sname_col[0], fname_col[0]]].rename(
                                        columns={sname_col[0]: 'Student Name', fname_col[0]: 'Father Name'}
                                    ),
                                    on='Student Name', how='left'
                                )

                        low = summary[summary['Attendance %'] < 75]
                        ok  = summary[summary['Attendance %'] >= 75]

                        col1, col2, col3 = st.columns(3)
                        col1.metric("Total Students", len(summary))
                        col2.metric("⚠️ Below 75%", len(low), delta=f"-{len(low)}", delta_color="inverse")
                        col3.metric("✅ Above 75%", len(ok))

                        if not low.empty:
                            st.markdown("### 🚨 Critical Attendance Alert")
                            for _, row in low.iterrows():
                                father = row.get('Father Name', 'N/A')
                                st.markdown(
                                    f'<div class="critical-alert">⚠️ <b>{row["Student Name"]}</b> '
                                    f'(S/O {father}) — Attendance: <b>{row["Attendance %"]}%</b></div>',
                                    unsafe_allow_html=True
                                )
                                st.write("")

                        st.markdown("### 📋 Full Attendance Summary")
                        st.dataframe(summary, use_container_width=True)
                    else:
                        st.warning("Column names not recognized. Check sheet headers.")
                        st.write("Found columns:", list(att_df.columns))
                except Exception as e:
                    st.error(f"Error processing analytics: {e}")

        # --- TAB 2: Mark Attendance ---
        with tabs[1]:
            st.subheader("📝 Mark Class Attendance")
            att_date = st.date_input("📅 Select Date (Backdate Allowed):", value=date.today(), max_value=date.today())

            col1, col2 = st.columns(2)
            with col1:
                slot = st.selectbox("🕐 Lecture Slot:", ["1st Slot", "2nd Slot", "3rd Slot", "4th Slot"])
                discipline = st.selectbox("🏥 Discipline:", ["MLT", "MIT", "DPT", "Radiology", "Nursing"])
            with col2:
                semester = st.selectbox("📚 Semester:", ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester"])
                subject = st.text_input("📖 Subject Name:")

            topic = st.text_input("🎯 Topic Covered:")

            students_df = get_data("STUDENTS LIST!A:E")

            if not students_df.empty:
                students_df.columns = [c.strip().title() for c in students_df.columns]

                # Split S/O from name if combined
                name_col = students_df.columns[0]
                if 'Father' not in ''.join(students_df.columns):
                    if students_df[name_col].str.contains(r'\bS/O\b', case=False, na=False).any():
                        students_df[['Student Name', 'Father Name']] = students_df[name_col].str.split(
                            r'\s*S/O\s*', n=1, expand=True, regex=True
                        )
                    else:
                        students_df['Student Name'] = students_df[name_col]
                        students_df['Father Name'] = students_df.iloc[:, 1] if len(students_df.columns) > 1 else "N/A"
                else:
                    sname_col = [c for c in students_df.columns if 'name' in c.lower() and 'father' not in c.lower()]
                    fname_col = [c for c in students_df.columns if 'father' in c.lower()]
                    students_df['Student Name'] = students_df[sname_col[0]] if sname_col else students_df[name_col]
                    students_df['Father Name'] = students_df[fname_col[0]] if fname_col else "N/A"

                st.markdown("#### 👥 Mark Attendance Below:")
                attendance_data = {}

                for idx, row in students_df.iterrows():
                    sname = str(row.get('Student Name', '')).strip()
                    fname = str(row.get('Father Name', '')).strip()
                    if sname:
                        c1, c2, c3 = st.columns([3, 1, 1])
                        with c1:
                            st.write(f"**{sname}** *(S/O {fname})*")
                        with c2:
                            present = st.checkbox("Present", key=f"p_{idx}", value=True)
                        with c3:
                            if not present:
                                st.markdown("🔴 Absent")
                            else:
                                st.markdown("🟢 Present")
                        attendance_data[sname] = ("P" if present else "A", fname)

                if st.button("💾 SUBMIT ATTENDANCE TO GOOGLE SHEETS"):
                    if not subject:
                        st.error("Please enter Subject Name before submitting.")
                    elif not topic:
                        st.error("Please enter Topic Covered before submitting.")
                    else:
                        rows_to_save = []
                        for sname, (status, fname) in attendance_data.items():
                            rows_to_save.append([
                                str(att_date),
                                slot,
                                discipline,
                                semester,
                                subject,
                                topic,
                                sname,
                                fname,
                                status,
                                u.get('Full Name', role)
                            ])
                        success = sync_sheet("ATTENDANCE HISTORY!A:J", rows_to_save, mode="append")
                        if success:
                            st.success("✅ Attendance saved to Google Sheets! HOD notified via live sync.")
                            st.balloons()
            else:
                st.warning("⚠️ Student list not found in Google Sheets. Check 'STUDENTS LIST' tab.")

        # --- TAB 3: Faculty Stall (HOD Only) ---
        with tabs[2]:
            if role == 'HOD':
                st.subheader("⚙️ Faculty Stall — HOD Master Control")
                users_df = get_data("USERS_CREDENTIALS!A:F")

                col1, col2 = st.columns(2)

                with col1:
                    st.markdown("#### 👨‍🏫 Current Faculty List")
                    if not users_df.empty:
                        role_col = [c for c in users_df.columns if 'role' in c.lower()]
                        name_col = [c for c in users_df.columns if 'name' in c.lower()]
                        if role_col and name_col:
                            fac_df = users_df[users_df[role_col[0]] == 'Faculty']
                            st.dataframe(fac_df[[name_col[0], role_col[0]]], use_container_width=True)
                        else:
                            st.dataframe(users_df, use_container_width=True)
                    else:
                        st.info("No faculty data found.")

                with col2:
                    st.markdown("#### ➕ Add New Faculty")
                    new_name = st.text_input("Full Name:", key="new_fac_name")
                    new_role = st.selectbox("Role:", ["Faculty", "COORDINATOR"], key="new_fac_role")
                    new_dept = st.text_input("Department/Subject:", key="new_fac_dept")
                    new_pass = st.text_input("Set Password:", type="password", key="new_fac_pass")

                    if st.button("➕ ADD FACULTY TO SHEET"):
                        if new_name and new_pass:
                            sync_sheet(
                                "USERS_CREDENTIALS!A:F",
                                [[new_name, new_role, new_dept, new_pass, "", str(datetime.now().date())]],
                                mode="append"
                            )
                            st.success(f"✅ {new_name} added successfully!")
                            st.rerun()
                        else:
                            st.error("Name and Password are required.")

                    st.markdown("---")
                    st.markdown("#### 🗑️ Remove Faculty")
                    if not users_df.empty:
                        role_col_r = [c for c in users_df.columns if 'role' in c.lower()]
                        name_col_r = [c for c in users_df.columns if 'name' in c.lower()]
                        if role_col_r and name_col_r:
                            fac_names = users_df[users_df[role_col_r[0]] == 'Faculty'][name_col_r[0]].tolist()
                            remove_name = st.selectbox("Select to Remove:", fac_names)
                            if st.button("🗑️ REMOVE FROM SHEET", type="primary"):
                                updated = users_df[users_df[name_col_r[0]] != remove_name]
                                all_vals = [updated.columns.tolist()] + updated.values.tolist()
                                sync_sheet("USERS_CREDENTIALS!A:F", all_vals, mode="update")
                                st.success(f"✅ {remove_name} removed.")
                                st.rerun()
            else:
                st.info("🔒 Faculty Stall is accessible by HOD only.")

    # =========================================================
    # FACULTY DASHBOARD
    # =========================================================
    elif role == 'Faculty':
        st.title(f"🎓 Teacher Module — {u.get('Full Name', '')}")
        st.subheader("📝 Mark Class Attendance")

        att_date = st.date_input("📅 Select Date (Backdate Allowed):", value=date.today(), max_value=date.today())

        col1, col2 = st.columns(2)
        with col1:
            slot = st.selectbox("🕐 Lecture Slot:", ["1st Slot", "2nd Slot", "3rd Slot", "4th Slot"])
            discipline = st.selectbox("🏥 Discipline:", ["MLT", "MIT", "DPT", "Radiology", "Nursing"])
        with col2:
            semester = st.selectbox("📚 Semester:", ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester"])
            subject = st.text_input("📖 Subject Name:")

        topic = st.text_input("🎯 Topic Covered:")

        students_df = get_data("STUDENTS LIST!A:E")

        if not students_df.empty:
            students_df.columns = [c.strip().title() for c in students_df.columns]

            name_col = students_df.columns[0]
            if students_df[name_col].str.contains(r'\bS/O\b', case=False, na=False).any():
                students_df[['Student Name', 'Father Name']] = students_df[name_col].str.split(
                    r'\s*S/O\s*', n=1, expand=True, regex=True
                )
            else:
                students_df['Student Name'] = students_df[name_col]
                students_df['Father Name'] = students_df.iloc[:, 1] if len(students_df.columns) > 1 else "N/A"

            st.markdown("#### 👥 Student List — Mark Present/Absent:")
            attendance_data = {}

            for idx, row in students_df.iterrows():
                sname = str(row.get('Student Name', '')).strip()
                fname = str(row.get('Father Name', '')).strip()
                if sname:
                    c1, c2, c3 = st.columns([3, 1, 1])
                    with c1:
                        st.write(f"**{sname}** *(S/O {fname})*")
                    with c2:
                        present = st.checkbox("Present", key=f"fp_{idx}", value=True)
                    with c3:
                        st.markdown("🟢 Present" if present else "🔴 Absent")
                    attendance_data[sname] = ("P" if present else "A", fname)

            if st.button("💾 SUBMIT ATTENDANCE TO GOOGLE SHEETS"):
                if not subject:
                    st.error("Please enter Subject Name.")
                elif not topic:
                    st.error("Please enter Topic Covered.")
                else:
                    rows_to_save = []
                    for sname, (status, fname) in attendance_data.items():
                        rows_to_save.append([
                            str(att_date), slot, discipline, semester,
                            subject, topic, sname, fname, status,
                            u.get('Full Name', 'Faculty')
                        ])
                    success = sync_sheet("ATTENDANCE HISTORY!A:J", rows_to_save, mode="append")
                    if success:
                        st.success("✅ Attendance submitted! HOD notified via live sync.")
                        st.balloons()
        else:
            st.warning("⚠️ Student list not loaded. Check 'STUDENTS LIST' tab in Google Sheets.")

    # =========================================================
    # STUDENT PORTAL
    # =========================================================
    elif role == 'Student':
        student_name = u.get('Full Name', '')
        st.title(f"🎓 Student Portal — {student_name}")

        att_df = get_data("ATTENDANCE HISTORY!A:J")
        stu_df = get_data("STUDENTS LIST!A:E")

        if att_df.empty:
            st.info("No attendance records found yet.")
        else:
            att_df.columns = [c.strip().title() for c in att_df.columns]

            # Find student name column
            scol = [c for c in att_df.columns if 'student' in c.lower() or ('name' in c.lower() and 'father' not in c.lower())]
            if not scol:
                st.error("Cannot find student name column in attendance sheet.")
            else:
                scol = scol[0]
                my_records = att_df[att_df[scol].str.strip().str.lower() == student_name.strip().lower()]

                if my_records.empty:
                    st.warning(f"No records found for '{student_name}'. Contact your coordinator.")
                else:
                    # Get Father Name
                    fname_col = [c for c in att_df.columns if 'father' in c.lower()]
                    father_name = my_records[fname_col[0]].iloc[0] if fname_col else "N/A"

                    st.markdown(f"**Student:** {student_name} &nbsp;|&nbsp; **S/O:** {father_name}")

                    status_col = [c for c in att_df.columns if 'status' in c.lower() or 'present' in c.lower()]
                    subj_col   = [c for c in att_df.columns if 'subject' in c.lower()]
                    date_col   = [c for c in att_df.columns if 'date' in c.lower()]
                    slot_col   = [c for c in att_df.columns if 'slot' in c.lower()]
                    topic_col  = [c for c in att_df.columns if 'topic' in c.lower()]

                    # --- Semester Summary ---
                    st.markdown("### 📊 Semester-wise Attendance Summary")
                    if status_col and subj_col:
                        summary = my_records.groupby(subj_col[0])[status_col[0]].apply(
                            lambda x: round((x.str.upper() == 'P').sum() / len(x) * 100, 1)
                        ).reset_index()
                        summary.columns = ['Subject', 'Attendance %']

                        for _, row in summary.iterrows():
                            pct = row['Attendance %']
                            color = "#ff4b4b" if pct < 75 else "#d29922" if pct < 85 else "#28a745"
                            warn  = " ⚠️ LOW ATTENDANCE" if pct < 75 else ""
                            st.markdown(
                                f'<div style="background:#1b263b;padding:12px;border-radius:10px;margin-bottom:8px;border-left:4px solid {color};">'
                                f'<b style="color:white">{row["Subject"]}</b>'
                                f'<span style="color:{color};float:right;font-weight:bold">{pct}%{warn}</span>'
                                f'<div style="background:#0d1117;border-radius:6px;height:8px;margin-top:8px;">'
                                f'<div style="background:{color};width:{min(pct,100)}%;height:8px;border-radius:6px;"></div>'
                                f'</div></div>',
                                unsafe_allow_html=True
                            )

                    # --- Date-wise History ---
                    st.markdown("### 📅 Date-wise Attendance History")
                    if date_col and status_col:
                        show_cols = []
                        if date_col:  show_cols.append(date_col[0])
                        if subj_col:  show_cols.append(subj_col[0])
                        if topic_col: show_cols.append(topic_col[0])
                        if slot_col:  show_cols.append(slot_col[0])
                        if status_col: show_cols.append(status_col[0])

                        history = my_records[show_cols].copy()
                        history[status_col[0]] = history[status_col[0]].apply(
                            lambda x: "🟢 Present" if str(x).upper() == 'P' else "🔴 Absent"
                        )
                        st.dataframe(history, use_container_width=True)
                    else:
                        st.dataframe(my_records, use_container_width=True)
