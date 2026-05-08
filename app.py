import streamlit as st
import pandas as pd
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import json

# --- 1. PAGE SETUP ---
st.set_page_config(page_title="AUTOMATIC ATTENDANCE SYSTEM", layout="wide", page_icon="🎓")

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

# ⚠️ YAHAN APNI GOOGLE SHEET KA MUKAMMAL LINK PASTE KAREIN (Single quotes ke andar)
SHEET_URL = 'YAHAN_APNI_SHEET_KA_LINK_PASTE_KAREIN'

@st.cache_data(ttl=60)
def load_data():
    # Ab system naam ke bajaye direct Link se sheet dhoondega (100% error-free)
    sh = gc.open_by_url(SHEET_URL)
    
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
                        <p style='color:#28a745; font-size:22px;'><b>Total Fine Due:</b> Rs. {fines} PKR
