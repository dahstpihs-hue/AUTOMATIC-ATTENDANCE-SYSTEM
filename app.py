import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- 1. PAGE CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

# Google Sheets Setup
SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- 2. ELITE UI STYLING & BLINKING EFFECT ---
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
        text-align: center; margin-bottom: 30px;
    }
    .stButton>button { 
        width: 100%; background-image: linear-gradient(to right, #28a745, #218838); 
        color: white; font-weight: bold; border-radius: 10px; height: 3.5em;
    }
    </style>
    """, unsafe_allow_html=True)

# --- 3. DATABASE FUNCTIONS ---
def get_service():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_data(tab_name):
    try:
        service = get_service()
        # Using single quotes to handle spaces in tab names automatically
        range_name = f"'{tab_name}'!A:Z"
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
        values = result.get('values', [])
        if not values: return pd.DataFrame()
        df = pd.DataFrame(values[1:], columns=values[0])
        df.columns = df.columns.str.strip()
        return df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
    except Exception:
        return pd.DataFrame()

def save_attendance(rows):
    try:
        service = get_service()
        body = {'values': rows}
        service.spreadsheets().values().append(
            spreadsheetId=SHEET_ID, range="'ATTENDANCE HISTORY'!A:R",
            valueInputOption="RAW", body=body).execute()
        return True
    except: return False

# --- 4. HEADER ---
if 'first_load' not in st.session_state:
    st.balloons()
    st.session_state.first_load = True

st.markdown("""
<div class="gateway-master">
    <div class="blinking-text">WELCOME TO THE</div>
    <h1 style="color:white; font-size:26px; letter-spacing: 2px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700; font-size:18px;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- 5. AUTHENTICATION ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    users_df = get_data("USERS CREDENTIALS")
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        role_sel = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'FACULTY MEMBER', 'STUDENT'])
        if role_sel in ['HOD', 'COORDINATOR']:
            pwd = st.text_input("PASSWORD", type="password")
            if st.button("LOGIN"):
                match = users_df[(users_df['Role'].str.contains(role_sel, case=False, na=False)) & (users_df['Password'] == pwd.strip())]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user_data = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("Access Denied")
        elif role_sel == 'FACULTY MEMBER':
            names = users_df[users_df['Role'].str.contains('Faculty', case=False, na=False)]['Full Name'].tolist()
            name_sel = st.selectbox("NAME:", names)
            pwd = st.text_input("PASSWORD", type="password")
            if st.button("VERIFY"):
                match = users_df[(users_df['Full Name'] == name_sel) & (users_df['Password'] == pwd.strip())]
                if not match.empty:
                    st.session_state.logged_in, st.session_state.user_data = True, match.iloc[0].to_dict()
                    st.rerun()

# --- 6. DASHBOARD ---
else:
    user = st.session_state.user_data
    st.sidebar.success(f"User: {user['Full Name']}")
    
    # Check if user has permission
    if any(r.strip().lower() in ['hod', 'coordinator', 'faculty'] for r in user['Role'].split(',')):
        st.header(f"🛡️ {user['Role']} Operations")
        
        # Load Students from "STUDENTS LIST" tab
        std_df = get_data("STUDENTS LIST")
        
        if not std_df.empty:
            c1, c2 = st.columns(2)
            disc = c1.selectbox("Discipline", std_df['DISCIPLINE'].unique())
            batch = c2.selectbox("Batch", std_df['BATCH'].unique())
            
            filtered = std_df[(std_df['DISCIPLINE'] == disc) & (std_df['BATCH'] == batch)]
            sem = filtered.iloc[0]['SEMESTER'] if not filtered.empty else "N/A"
            st.info(f"Marking: {disc} | Batch: {batch} | Semester: {sem}")
            
            subj = st.text_input("Subject").upper()
            topic = st.text_area("Lecture Topic")
            
            attendance_list = []
            for i, row in filtered.iterrows():
                col1, col2 = st.columns([3, 2])
                stat = col2.radio(f"{row['STUDENT NAME']}", ["P", "A", "L", "S/L"], horizontal=True, key=f"s_{i}")
                attendance_list.append({"name": row['STUDENT NAME'], "father": row.get('Father Name', 'N/A'), "status": stat})
            
            if st.button("SUBMIT ATTENDANCE"):
                if subj and topic:
                    dt, tm = datetime.now().strftime("%Y-%m-%d"), datetime.now().strftime("%H:%M:%S")
                    rows = [[dt, tm, "Day", "Slot", user['Full Name'].upper(), user['Department'], disc, subj, "Start", "End", "Dur", topic, r['name'], r['father'], r['status'], (100 if r['status'] == "A" else 0), batch, sem] for r in attendance_list]
                    if save_attendance(rows):
                        st.balloons()
                        st.success("✅ DATA RECORDED SUCCESSFULLY")
                else: st.warning("Please fill Subject and Topic")
        else:
            st.error("Cannot read 'STUDENTS LIST'. Please check tab name in Google Sheets.")

    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
