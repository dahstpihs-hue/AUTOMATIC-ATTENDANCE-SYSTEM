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

# --- ELITE UI STYLING ---
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
    .stTextInput>div>div>input, .stSelectbox>div>div>div { background-color: #1b263b !important; color: white !important; }
    </style>
    """, unsafe_allow_html=True)

# --- BACKEND FUNCTIONS ---
def get_service():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_data(range_name):
    try:
        service = get_service()
        # Using single quotes for sheet names with spaces
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=f"'{range_name}'!A:Z").execute()
        values = result.get('values', [])
        if not values: return pd.DataFrame()
        df = pd.DataFrame(values[1:], columns=values[0])
        df.columns = df.columns.str.strip().str.upper()
        df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
        return df
    except Exception as e:
        return pd.DataFrame()

def submit_attendance(rows):
    service = get_service()
    body = {'values': rows}
    service.spreadsheets().values().append(
        spreadsheetId=SHEET_ID, range="'ATTENDANCE HISTORY'!A:R",
        valueInputOption="RAW", body=body).execute()

# --- HEADER & CELEBRATION ---
if 'logged_in' not in st.session_state:
    st.balloons()

st.markdown("""
<div class="gateway-master">
    <div class="blinking-text">WELCOME TO THE</div>
    <h1 style="color:white; font-size:26px; letter-spacing: 2px; margin-top:0px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700; font-size:18px;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- AUTH LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    users_df = get_data("USERS CREDENTIALS")
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.subheader("🔒 SECURE LOGIN")
        role_selection = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'FACULTY MEMBER'])
        
        if role_selection in ['HOD', 'COORDINATOR']:
            u_name = st.text_input("Username (e.g. farooq.hod)")
            p_name = st.text_input("Password", type="password")
            if st.button("AUTHORIZE"):
                if not users_df.empty:
                    match = users_df[(users_df['USERNAME'] == u_name.strip()) & (users_df['PASSWORD'] == p_name.strip())]
                    if not match.empty:
                        st.session_state.logged_in = True
                        st.session_state.user = match.iloc[0].to_dict()
                        st.rerun()
                    else: st.error("❌ Incorrect Credentials")

        elif role_selection == 'FACULTY MEMBER':
            if not users_df.empty:
                faculty_names = users_df[users_df['ROLE'].str.upper() == 'FACULTY']['FULL NAME'].tolist()
                name_in = st.selectbox("SELECT YOUR NAME:", faculty_names)
                pass_in = st.text_input("PASSWORD", type="password")
                if st.button("VERIFY FACULTY"):
                    match = users_df[(users_df['FULL NAME'] == name_in) & (users_df['PASSWORD'] == pass_in.strip())]
                    if not match.empty:
                        st.session_state.logged_in = True
                        st.session_state.user = match.iloc[0].to_dict()
                        st.rerun()
                    else: st.error("❌ Incorrect Password")

else:
    user = st.session_state.user
    role, dept = user['ROLE'], user['DEPARTMENT']
    
    st.sidebar.success(f"Verified: {user['FULL NAME']}")
    st.sidebar.info(f"Department: {dept}")
    
    st.title(f"🛡️ {role} Portal - {dept}")
    
    # --- ATTENDANCE SYSTEM ---
    with st.expander("📝 MARK ATTENDANCE & LECTURE RECORD", expanded=True):
        df_students = get_data("STUDENTS LIST")
        
        if not df_students.empty:
            c1, c2 = st.columns(2)
            disc = c1.selectbox("1. Discipline", df_students['DISCIPLINE'].unique())
            batch = c2.selectbox("2. Batch", df_students['BATCH'].unique())

            # AUTO-SEMESTER & FILTERING
            match_st = df_students[(df_students['BATCH'] == batch) & (df_students['DISCIPLINE'] == disc)]
            semester = match_st.iloc[0]['SEMESTER'] if not match_st.empty else "N/A"
            
            now = datetime.now()
            st.warning(f"📅 {now.strftime('%Y-%m-%d')} | {now.strftime('%A')} | Semester: {semester}")

            subject = st.text_input("📖 Subject / Course Name")
            topic = st.text_area("🗒️ Lecture Topic / Record")

            if not match_st.empty:
                attendance_results = []
                st.markdown("---")
                for i, row in match_st.iterrows():
                    cn, cs = st.columns([3, 2])
                    status = cs.radio(f"{row['STUDENT NAME']} (S/O {row.get('FATHER NAME', 'N/A')})", ["P", "A", "L", "S/L"], horizontal=True, key=f"at_{i}")
                    attendance_results.append({"name": row['STUDENT NAME'], "father": row.get('FATHER NAME', 'N/A'), "status": status})

                if st.button("✅ SUBMIT RECORD"):
                    if not subject or not topic:
                        st.error("Please fill Subject and Topic fields!")
                    else:
                        final_rows = []
                        for res in attendance_results:
                            fine = 100 if res['status'] == 'A' else 0
                            final_rows.append([
                                now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"), now.strftime("%A"), 
                                "Slot", user['FULL NAME'], dept, disc, subject.upper(), 
                                "Start", "End", "Duration", topic, res['name'], res['father'], res['status'], 
                                fine, batch, semester
                            ])
                        submit_attendance(final_rows)
                        st.balloons()
                        st.success(f"✅ CONGRATULATIONS, ALL DATA RECORDED FOR {dept}")
        else:
            st.error("Error: Check 'STUDENTS LIST' tab in your Google Sheet!")

    if st.sidebar.button("🚪 Logout"):
        st.session_state.logged_in = False
        st.rerun()
