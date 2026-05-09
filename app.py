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

# --- ELITE UI STYLING & BLINKING ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black', sans-serif; font-size: 32px;
        color: #FFD700; animation: blinker 1.5s linear infinite;
        text-align: center; text-shadow: 0 0 20px #FFA500;
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
        # Clean all data from spaces
        df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
        return df
    except: return pd.DataFrame()

def submit_attendance(rows):
    service = get_service()
    body = {'values': rows}
    service.spreadsheets().values().append(
        spreadsheetId=SHEET_ID, range="'ATTENDANCE HISTORY'!A:R",
        valueInputOption="RAW", body=body).execute()

# --- HEADER & CELEBRATION ---
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
        st.subheader("🔒 SECURE GATEWAY ACCESS")
        role_selection = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'FACULTY MEMBER'])
        
        # FIX: Adding Username for HOD and Coordinator
        if role_selection in ['HOD', 'COORDINATOR']:
            u_name = st.text_input("Username (e.g., farooq.hod)")
            p_name = st.text_input("Password", type="password")
            if st.button("AUTHORIZE"):
                match = users_df[(users_df['Username'] == u_name.strip()) & (users_df['Password'] == p_name.strip())]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("❌ Incorrect Username or Password!")

        elif role_selection == 'FACULTY MEMBER':
            names = users_df[users_df['Role'] == 'Faculty']['Full Name'].tolist()
            name_in = st.selectbox("SELECT YOUR NAME:", names)
            pass_in = st.text_input("PASSWORD", type="password")
            if st.button("VERIFY FACULTY"):
                match = users_df[(users_df['Full Name'] == name_in) & (users_df['Password'] == pass_in.strip())]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("❌ Incorrect Credentials")

else:
    # --- DASHBOARD AREA ---
    user = st.session_state.user
    role = user['Role']
    dept = user['Department']
    
    st.sidebar.success(f"Verified: {user['Full Name']}")
    st.sidebar.info(f"Dept: {dept}")
    
    # Rights Management: HOD and Coordinator are also teachers
    st.title(f"🛡️ {role} Portal - {dept}")
    
    with st.expander("📝 MARK ATTENDANCE & LECTURE RECORD", expanded=True):
        df_students = get_data("'STUDENTS LIST'!A:Z")
        
        col1, col2 = st.columns(2)
        disc = col1.selectbox("Select Discipline", df_students['DISCIPLINE'].unique() if not df_students.empty else [])
        batch = col2.selectbox("Select Batch", df_students['BATCH'].unique() if not df_students.empty else [])

        # AUTO-SEMESTER LOGIC
        match_st = df_students[(df_students['BATCH'] == batch) & (df_students['DISCIPLINE'] == disc)]
        semester = match_st.iloc[0]['SEMESTER'] if not match_st.empty else "N/A"
        
        now = datetime.now()
        st.warning(f"📅 Date: {now.strftime('%Y-%m-%d')} | Day: {now.strftime('%A')} | Semester: {semester}")

        subj = st.text_input("📖 Subject Name")
        topic = st.text_area("🗒️ Lecture Record / Topic")

        if not match_st.empty:
            st.markdown("### 📋 Student List")
            att_data = []
            for i, row in match_st.iterrows():
                c_n, c_s = st.columns([3, 2])
                status = c_s.radio(f"{row['STUDENT NAME']}", ["P", "A", "L", "S/L"], horizontal=True, key=f"att_{i}")
                att_data.append({"name": row['STUDENT NAME'], "father": row['Father Name'], "status": status})

            if st.button("✅ SUBMIT TO DATABASE"):
                if not subj or not topic:
                    st.error("Ghalti! Subject aur Topic likhna zaroori hai.")
                else:
                    final_rows = []
                    for r in att_data:
                        fine = 100 if r['status'] == 'A' else 0
                        final_rows.append([
                            now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"), now.strftime("%A"), 
                            "Slot", user['Full Name'], dept, disc, subj.upper(), 
                            "Start", "End", "Duration", topic, r['name'], r['father'], r['status'], 
                            fine, batch, semester
                        ])
                    submit_attendance(final_rows)
                    st.balloons()
                    st.success(f"✅ CONGRATULATIONS, ALL DATA RECORDED FOR {dept}")

    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
