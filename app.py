import streamlit as st
import pandas as pd
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import json

# --- 1. PAGE SETUP ---
st.set_page_config(page_title="Department of Allied Health Sciences", layout="wide", page_icon="🎓")

# --- 2. GOOGLE SHEETS CONNECTION ---
@st.cache_resource
def init_connection():
    key_dict = json.loads(st.secrets["gcp_service_account"])
    creds = Credentials.from_service_account_info(
        key_dict, 
        scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    return gspread.authorize(creds)

gc = init_connection()
SHEET_NAME = 'Department_Database'

@st.cache_data(ttl=60)
def load_data():
    sh = gc.open(SHEET_NAME)
    users_sheet = sh.worksheet('USERS_CREDENTIALS')
    student_sheet = sh.get_worksheet(0)
    log_sheet = sh.get_worksheet(1)
    
    df_users = pd.DataFrame(users_sheet.get_all_records())
    df_students = pd.DataFrame(student_sheet.get_all_records())
    df_students.columns = df_students.columns.str.strip()
    df_students = df_students.applymap(lambda x: str(x).strip() if isinstance(x, str) else x)
    return sh, users_sheet, log_sheet, df_users, df_students

sh, users_sheet, log_sheet, df_users, df_students = load_data()

# --- 3. THEME ---
st.markdown("""
<style>
    .stApp { background-color: #0d1b2a; color: white; }
    h1, h2, h3 { color: #FFD700; text-align: center; }
    .welcome-text { text-align: center; font-size: 24px; font-weight: bold; color: white; }
    .success-box { background-color: #001d3d; padding: 20px; border: 2px solid #FFD700; border-radius: 10px; text-align: center; margin-top: 15px; }
</style>
""", unsafe_allow_html=True)

# --- 4. HEADER (WITHOUT IMAGES FOR NOW) ---
st.markdown("<h1>WELCOME TO THE</h1>", unsafe_allow_html=True)
st.markdown("<p class='welcome-text'>DEPARTMENT OF ALLIED HEALTH SCIENCES</p>", unsafe_allow_html=True)
st.divider()

# --- 5. SYSTEM LOGIN LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.session_state.username = ""
    st.session_state.role = ""
    st.session_state.must_change_pass = False
    st.session_state.row_idx = None

if not st.session_state.logged_in:
    st.subheader("🔒 SYSTEM AUTHENTICATION")
    login_type = st.radio("Select Portal:", ["STAFF LOGIN", "STUDENT PORTAL"], horizontal=True)
    
    if login_type == "STUDENT PORTAL":
        st.info("Student Portal Access (No Login Required)")
        if st.button("ENTER STUDENT PORTAL"):
            st.session_state.logged_in = True
            st.session_state.role = "STUDENT"
            st.rerun()
            
    elif login_type == "STAFF LOGIN":
        with st.form("login_form"):
            user_input = st.text_input("Username")
            pass_input = st.text_input("Password", type="password")
            submit_btn = st.form_submit_button("SECURE LOGIN")
            
            if submit_btn:
                user_val = user_input.strip()
                pass_val = pass_input.strip()
                match = df_users[(df_users['Username'] == user_val) & (df_users['Password'].astype(str) == str(pass_val))]
                
                if not match.empty:
                    user_data = match.iloc[0]
                    st.session_state.logged_in = True
                    st.session_state.username = user_val
                    st.session_state.role = user_data['Role']
                    st.session_state.row_idx = match.index[0] + 2
                    
                    if str(user_data['Is_First_Login']).strip().upper() == 'TRUE':
                        st.session_state.must_change_pass = True
                    st.rerun()
                else:
                    st.error("❌ INCORRECT USERNAME OR PASSWORD")

# --- 6. FORCE PASSWORD RESET ---
elif st.session_state.must_change_pass:
    st.warning(f"⚠️ SECURITY ALERT: Welcome {st.session_state.username}. You must change your default password to proceed.")
    with st.form("pass_reset"):
        new_pass = st.text_input("New Password", type="password")
        confirm_pass = st.text_input("Confirm Password", type="password")
        if st.form_submit_button("UPDATE PASSWORD"):
            if new_pass and new_pass == confirm_pass:
                users_sheet.update_cell(st.session_state.row_idx, 5, new_pass)
                users_sheet.update_cell(st.session_state.row_idx, 6, 'FALSE')
                st.session_state.must_change_pass = False
                st.success("✅ Password Updated! Please click 'Log Out' and log in again.")
            else:
                st.error("❌ Passwords do not match.")

# --- 7. MULTI-TIER DASHBOARDS ---
else:
    col_a, col_b = st.columns([4, 1])
    col_a.write(f"Logged in as: **{st.session_state.username}** | Role: **{st.session_state.role}**")
    if col_b.button("LOGOUT"):
        st.session_state.clear()
        st.rerun()
    st.divider()

    # --- A) STUDENT DASHBOARD ---
    if st.session_state.role == "STUDENT":
        st.header("🧑‍🎓 STUDENT TRANSPARENCY PORTAL")
        c1, c2 = st.columns(2)
        disc = c1.selectbox("Discipline", ['Radiology', 'MLT', 'Dental', 'Anaesthesia'])
        batch = c2.selectbox("Batch", sorted(list(df_students['BATCH'].unique())))
        
        match = df_students[(df_students['BATCH'].astype(str) == str(batch)) & (df_students['DISCIPLINE'] == disc)]
        sem = match.iloc[0]['SEMESTER'] if not match.empty else "N/A"
        st.info(f"**Detected Semester:** {sem}")
        
        if not match.empty:
            student_list = [f"{r['STUDENT NAME']} (S/O {r.get('Father Name','')})" for i, r in match.iterrows()]
            selected_student = st.selectbox("Select Your Name", student_list)
            
            if st.button("VIEW MY RECORD"):
                clean_name = selected_student.split(" (S/O")[0].strip()
                df_logs = pd.DataFrame(log_sheet.get_all_records())
                if not df_logs.empty:
                    my_logs = df_logs[df_logs['Student Name'].astype(str).str.strip() == clean_name]
                    absents = len(my_logs[my_logs['Status'] == 'A'])
                    fines = my_logs['Fine (Rs. 100)'].replace('', 0).astype(int).sum() if 'Fine (Rs. 100)' in my_logs.columns else absents * 100
                    
                    st.markdown(f"""
                    <div class='success-box'>
                        <h3 style='color:#FFD700;'>👤 RECORD: {clean_name}</h3>
                        <p style='color:white; font-size:18px;'><b>Total Classes Conducted:</b> {len(my_logs)}</p>
                        <p style='color:#dc3545; font-size:18px;'><b>Total Absents:</b> {absents}</p>
                        <p style='color:#28a745; font-size:22px;'><b>Total Fine Due:</b> Rs. {fines} PKR</p>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.warning("No attendance records found in the database yet.")

    # --- B) FACULTY DASHBOARD ---
    elif st.session_state.role == "Faculty":
        st.header("🎓 FACULTY REGULATORY PORTAL")
        with st.form("faculty_form"):
            c1, c2 = st.columns(2)
            instructor = c1.text_input("Instructor Name", value=st.session_state.username.upper())
            inst_dept = c2.selectbox("Instructor Dept", ['Radiology', 'MLT', 'Dental', 'Anaesthesia', 'Pharmacy', 'Nursing'])
            
            c3, c4, c5 = st.columns(3)
            disc = c3.selectbox("Discipline to Teach", ['Radiology', 'MLT', 'Dental', 'Anaesthesia'])
            batch = c4.selectbox("Batch", sorted(list(df_students['BATCH'].unique())))
            day = c5.selectbox("Day", ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], index=datetime.now().weekday() if datetime.now().weekday() < 6 else 0)
            
            c6, c7, c8 = st.columns(3)
            slot = c6.selectbox("Lecture Slot", ['1', '2', '3', '4'])
            times = ['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM']
            start_time = c7.selectbox("Start Time", times[:-1])
            end_time = c8.selectbox("End Time", times[1:])
            
            subject = st.text_input("Subject Name (CAPITAL)")
            topic = st.text_area("Lecture Record & Discussion Topic")
            
            st.markdown("### 📋 LOADED STUDENT LIST")
            match = df_students[(df_students['BATCH'].astype(str) == str(batch)) & (df_students['DISCIPLINE'] == disc)]
            sem = match.iloc[0]['SEMESTER'] if not match.empty else "N/A"
            st.caption(f"Semester Picked: {sem}")
            
            attendance_data = []
            if not match.empty:
                for i, r in match.iterrows():
                    f_name = r.get('Father Name', 'N/A')
                    s_name = r['STUDENT NAME']
                    col_name, col_att = st.columns([2, 3])
                    col_name.write(f"**{s_name}** (S/O {f_name})")
                    status = col_att.radio(f"Status for {s_name}", ['P', 'A', 'L', 'S/L'], horizontal=True, key=f"att_{i}", label_visibility="collapsed")
                    attendance_data.append({'name': s_name, 'father': f_name, 'status': status})
            else:
                st.warning("No students found. Check Batch and Discipline.")
                
            submitted = st.form_submit_button("SUBMIT TO DATABASE")
            
            if submitted:
                if not subject or not attendance_data:
                    st.error("❌ Mandatory fields missing (Subject or Student List).")
                else:
                    real_date = datetime.now().strftime("%Y-%m-%d")
                    real_ts = datetime.now().strftime("%H:%M:%S")
                    fmt = '%I:%M %p'
                    try:
                        tdelta = datetime.strptime(end_time, fmt) - datetime.strptime(start_time, fmt)
                        duration = f"{int(tdelta.seconds / 60)} Mins"
                    except: duration = "N/A"
                    
                    final_rows = []
                    total_fines = 0
                    for s in attendance_data:
                        fine = 100 if s['status'] == 'A' else 0
                        total_fines += fine
                        final_rows.append([real_date, real_ts, day, slot, instructor.upper(), inst_dept, disc, subject.upper(), start_time, end_time, duration, topic, s['name'], s['father'], s['status'], fine, batch, sem])
                    
                    log_sheet.append_rows(final_rows)
                    st.markdown(f"""
                    <div class='success-box'>
                        <h2 style='color: #28a745;'>✅ CONGRATULATIONS, YOUR ALL DATA HAS BEEN RECORDED</h2>
                        <p style='color: white; font-size: 16px;'><b>Timestamp:</b> {real_date} at {real_ts}</p>
                        <p style='color: white; font-size: 16px;'><b>Total Absentees Fined:</b> Rs. {total_fines} PKR</p>
                    </div>
                    """, unsafe_allow_html=True)

    # --- C) HOD / ADMIN DASHBOARD ---
    elif st.session_state.role in ["HOD", "Coordinator"]:
        st.header(f"🛡️ EXECUTIVE PANEL: {st.session_state.role}")
        df_logs = pd.DataFrame(log_sheet.get_all_records())
        if not df_logs.empty:
            total_classes = len(df_logs['Timestamp'].unique())
            total_absents = len(df_logs[df_logs['Status'] == 'A'])
            total_fines = df_logs['Fine (Rs. 100)'].replace('', 0).astype(int).sum() if 'Fine (Rs. 100)' in df_logs.columns else 0
            
            c1, c2, c3 = st.columns(3)
            c1.metric("TOTAL CLASSES", total_classes)
            c2.metric("TOTAL ABSENTEES", total_absents)
            c3.metric("FINES GENERATED", f"Rs. {total_fines}")
            
            st.subheader("🔍 SYSTEM TRACKING LOGS")
            st.dataframe(df_logs.tail(20).iloc[::-1], use_container_width=True)
        else:
            st.info("No tracking data available yet.")
