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
        font-family: 'Arial Black', sans-serif;
        font-size: 32px;
        color: #FFD700;
        animation: blinker 1.5s linear infinite;
        text-align: center;
        text-shadow: 0 0 20px #FFA500;
    }
    
    .gateway-master { 
        background-color: #001d3d; 
        padding: 30px; 
        border-radius: 20px; 
        border: 2px solid #FFD700; 
        box-shadow: 0px 10px 40px rgba(0,0,0,0.9);
        text-align: center;
        margin-bottom: 20px;
    }
    
    .stButton>button { 
        width: 100%; 
        background-image: linear-gradient(to right, #28a745, #218838); 
        color: white; 
        font-weight: bold; 
        border-radius: 10px; 
        height: 3.5em;
        border: none;
    }
    </style>
    """, unsafe_allow_html=True)

# --- 3. BACKEND FUNCTIONS ---
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
        df.columns = df.columns.str.strip()
        # Clean white spaces from all data
        df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
        return df
    except Exception as e:
        st.error(f"Database Error: {e}")
        return pd.DataFrame()

# --- 4. HEADER & CELEBRATIONS ---
if 'first_load' not in st.session_state:
    st.balloons()
    st.session_state.first_load = True

st.markdown("""
<div class="gateway-master">
    <div class="blinking-text">WELCOME TO THE</div>
    <h1 style="color:white; font-size:26px; letter-spacing: 2px; margin-top:10px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700; font-size:18px;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- 5. AUTHENTICATION LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    users_df = get_data("'USERS CREDENTIALS'!A:F")
    
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.markdown("<br>", unsafe_allow_html=True)
        st.subheader("🔒 SECURE GATEWAY ACCESS")
        role_selection = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'FACULTY MEMBER', 'STUDENT'])
        
        if role_selection in ['HOD', 'COORDINATOR']:
            pass_input = st.text_input("ENTER SYSTEM PASSWORD", type="password")
            if st.button("AUTHORIZE & ENTER"):
                if not users_df.empty:
                    # Smart matching: Search if selection exists in Role string (e.g. 'HOD' in 'HOD, faculty')
                    match = users_df[
                        (users_df['Role'].str.contains(role_selection, case=False, na=False)) & 
                        (users_df['Password'] == pass_input.strip())
                    ]
                    if not match.empty:
                        st.session_state.logged_in = True
                        st.session_state.user_data = match.iloc[0].to_dict()
                        st.rerun()
                    else: st.error("❌ Incorrect Password!")

        elif role_selection == 'FACULTY MEMBER':
            if not users_df.empty:
                # Get names where role contains 'Faculty'
                fac_list = users_df[users_df['Role'].str.contains('Faculty', case=False, na=False)]['Full Name'].tolist()
                selected_faculty = st.selectbox("SELECT YOUR NAME:", fac_list)
                f_pass_input = st.text_input("PASSWORD", type="password")
                if st.button("VERIFY FACULTY"):
                    match = users_df[(users_df['Full Name'] == selected_faculty) & (users_df['Password'] == f_pass_input.strip())]
                    if not match.empty:
                        st.session_state.logged_in = True
                        st.session_state.user_data = match.iloc[0].to_dict()
                        st.rerun()
                    else: st.error("❌ Invalid Credentials")

        elif role_selection == 'STUDENT':
            if st.button("ENTER STUDENT PORTAL"):
                st.session_state.logged_in = True
                st.session_state.user_data = {'Role': 'Student', 'Full Name': 'Portal Guest'}
                st.rerun()

# --- 6. DASHBOARD AREA ---
else:
    user = st.session_state.user_data
    st.sidebar.success(f"Session Active: {user['Full Name']}")
    st.title(f"🛡️ {user['Role']} Dashboard")
    
    # Combined Rights for HOD, Coordinator, and Faculty
    if any(role.strip().lower() in ['hod', 'coordinator', 'faculty'] for role in user['Role'].split(',')):
        st.markdown("### 📝 Operations Management")
        st.info("Aap yahan se attendance aur lecture records manage kar sakte hain.")

    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
