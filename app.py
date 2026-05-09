import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

# Google Sheets Setup
SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- ELITE UI STYLING & BLINKING EFFECT ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black', sans-serif; font-size: 32px;
        color: #FFD700; animation: blinker 1.5s linear infinite;
        text-align: center; text-shadow: 0 0 20px #FFA500;
        margin-bottom: 5px;
    }
    .gateway-master { 
        background-color: #001d3d; padding: 30px; border-radius: 20px; 
        border: 2px solid #FFD700; box-shadow: 0px 10px 40px rgba(0,0,0,0.9);
        text-align: center; margin-bottom: 25px;
    }
    .stButton>button { 
        width: 100%; background-image: linear-gradient(to right, #28a745, #218838); 
        color: white; font-weight: bold; border-radius: 10px; height: 3.5em; border: none;
    }
    </style>
    """, unsafe_allow_html=True)

# --- BACKEND FUNCTIONS ---
def get_service():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_data(range_name):
    try:
        service = get_service()
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
        values = result.get('values', [])
        if not values: return pd.DataFrame()
        
        df = pd.DataFrame(values[1:], columns=values[0])
        # Sab headers ko UPPERCASE aur Clean kar diya taake KeyError na aaye
        df.columns = df.columns.str.strip().str.upper()
        df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
        return df
    except Exception as e:
        st.error(f"Database Error: {e}")
        return pd.DataFrame()

def submit_attendance(rows):
    service = get_service()
    body = {'values': rows}
    service.spreadsheets().values().append(
        spreadsheetId=SHEET_ID, range="'ATTENDANCE HISTORY'!A:R",
        valueInputOption="RAW", body=body).execute()

# --- HEADER & BALLOONS ---
if 'first_load' not in st.session_state:
    st.balloons()
    st.session_state.first_load = True

st.markdown("""
<div class="gateway-master">
    <div class="blinking-text">WELCOME TO THE</div>
    <h1 style="color:white; font-size:26px; letter-spacing: 2px; margin-top:0px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700; font-size:18px;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- LOGIN LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    users_df = get_data("'USERS CREDENTIALS'!A:F")
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        role_selection = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'FACULTY MEMBER'])
        
        if role_selection in ['HOD', 'COORDINATOR']:
            u_name = st.text_input("Username (e.g., farooq.hod)")
            p_name = st.text_input("Password", type="password")
            if st.button("AUTHORIZE"):
                if not users_df.empty:
                    # Clean match for HOD
                    match = users_df[(users_df['USERNAME'] == u_name.strip()) & (users_df['PASSWORD'] == p_name.strip())]
                    if not match.empty:
                        st.session_state.logged_in = True
                        st.session_state.user = match.iloc[0].to_dict()
                        st.rerun()
                    else: st.error("❌ Invalid Credentials")

        elif role_selection == 'FACULTY MEMBER':
            if not users_df.empty:
                # Faculty list from database
                faculty_names = users_df[users_df['ROLE'].str.upper() == 'FACULTY']['FULL Name'].tolist()
                name_in = st.selectbox("SELECT YOUR NAME:", faculty_names)
                pass_in = st.text_input("PASSWORD", type="password")
                if st.button("VERIFY FACULTY"):
                    match = users_df[(users_df['FULL NAME'] == name_in) & (users_df['PASSWORD'] == pass_in.strip())]
                    if not match.empty:
                        st.session_state.logged_in = True
                        st.session_state.user = match.iloc[0].to_dict()
                        st.rerun()

else:
    # --- TEACHER DASHBOARD AREA ---
    user = st.session_state.user
    role = user['ROLE']
    dept = user['DEPARTMENT']
    
    st.sidebar.success(f"Verified: {user['FULL NAME']}")
    st.sidebar.info(f"Dept: {dept}")
    
    st.title(f"🛡️ {role} Portal - {dept}")
    
    with st.expander("📝 MARK ATTENDANCE & LECTURE RECORD", expanded=True):
        # Fetching Students Master List
        df_students = get_data("'STUDENTS LIST'!A:Z")
        
        if not df_students.empty:
            # Check for necessary columns
            required_cols = ['BATCH', 'DISCIPLINE', 'SEMESTER', 'STUDENT NAME']
            if all(col in df_students.columns for col in required_cols):
                
                c1, c2 = st.columns(2)
                disc_choice = c1.selectbox("1. Select Discipline", df_students['DISCIPLINE'].unique())
                batch_choice = c2.selectbox("2. Select Batch", df_students['BATCH'].unique())

                # AUTO-SEMESTER LOGIC
                match_st = df_students[(df_students['BATCH'] == batch_choice) & (df_students['DISCIPLINE'] == disc_choice)]
                semester = match_st.iloc[0]['SEMESTER'] if not match_st.empty else "N/A"
                
                now = datetime.now()
                st.warning(f"📅 Date: {now.strftime('%Y-%m-%d')} | Day: {now.strftime('%A')} | Semester: {semester}")

                subject = st.text_input("📖 Subject / Course Name")
                topic = st.text_area("🗒️ Lecture Topic / Record")

                if not match_st.empty:
                    st.markdown("### 📋 Student List")
                    attendance_results = []
                    for i, row in match_st.iterrows():
                        col_n, col_s = st.columns([3, 2])
                        s_name = row['STUDENT NAME']
                        # Father name safety check
                        f_name = row.get('FATHER NAME', 'N/A')
                        
                        status = col_s.radio(f"{s_name} (S/O {f_name})", ["P", "A", "L", "S/L"], horizontal=True, key=f"att_{i}")
                        attendance_results.append({"name": s_name, "father": f_name, "status": status})

                    if st.button("✅ SUBMIT RECORD"):
                        if not subject or not topic:
                            st.error("Ghalti! Subject aur Topic likhna zaroori hai.")
                        else:
                            final_rows = []
                            for r in attendance_results:
                                fine = 100 if r['status'] == 'A' else 0
                                final_rows.append([
                                    now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"), now.strftime("%A"), 
                                    "Slot", user['FULL NAME'], dept, disc_choice, subject.upper(), 
                                    "Start", "End", "Duration", topic, r['name'], r['father'], r['status'], 
                                    fine, batch_choice, semester
                                ])
                            submit_attendance(final_rows)
                            st.balloons()
                            st.success(f"✅ CONGRATULATIONS, ALL DATA RECORDED FOR {dept}")
                else:
                    st.info("Is Batch/Discipline mein koi students nahi hain.")
            else:
                st.error(f"Sheet Columns missing! Ensure: {required_cols}")
        else:
            st.error("STUDENTS LIST tab khali hai!")

    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
