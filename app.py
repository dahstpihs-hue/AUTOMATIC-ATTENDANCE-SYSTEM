import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account

# --- CONFIGURATION ---
st.set_page_config(page_title="PIHS Portal", layout="wide")

# Google Sheets Details (Aapki Asli ID)
SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# CSS for Beautiful UI (Colab & Professional Style)
st.markdown("""
    <style>
    .main { background-color: #f0f2f6; }
    .stButton>button { width: 100%; border-radius: 8px; background-color: #1a73e8; color: white; font-weight: bold; height: 3em; }
    .stTextInput>div>div>input { border-radius: 8px; }
    h1 { color: #1a73e8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; }
    .auth-box { background-color: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    </style>
    """, unsafe_allow_html=True)

# Authentication Function
def authenticate_sheets():
    try:
        creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
        return build('sheets', 'v4', credentials=creds)
    except Exception as e:
        st.error(f"Authentication Error: {e}")
        return None

def get_sheet_data(range_name):
    service = authenticate_sheets()
    if service:
        try:
            result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
            values = result.get('values', [])
            if values:
                return pd.DataFrame(values[1:], columns=values[0])
        except Exception as e:
            st.error(f"Sheet Data Error: {e}")
    return pd.DataFrame()

def update_password_in_sheet(username, new_password):
    service = authenticate_sheets()
    df = get_sheet_data("USERS CREDENTIALS!A:C")
    if not df.empty:
        # Finding the row (Excel row starts at 1, header is 1, so data starts at 2)
        try:
            row_idx = df[df['Username'] == username].index[0] + 2
            body = {'values': [[new_password]]}
            service.spreadsheets().values().update(
                spreadsheetId=SHEET_ID, range=f"USERS CREDENTIALS!B{row_idx}",
                valueInputOption="RAW", body=body).execute()
            return True
        except:
            return False
    return False

# --- SESSION STATE ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.session_state.user = None
    st.session_state.role = None

# --- LOGIN SCREEN ---
def show_login():
    st.markdown("<h1>🎓 ALLIED HEALTH SCIENCES PORTAL</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #5f6368;'>THE PROFESSIONALS INSTITUTE OF HEALTH SCIENCES, MARDAN</p>", unsafe_allow_html=True)
    
    cols = st.columns([1, 2, 1])
    with cols[1]:
        st.markdown("<div class='auth-box'>", unsafe_allow_html=True)
        u = st.text_input("👤 Username")
        p = st.text_input("🔑 Password", type="password")
        if st.button("Login"):
            users_df = get_sheet_data("USERS CREDENTIALS!A:C")
            if not users_df.empty:
                # Cleaning data to avoid space errors
                users_df['Username'] = users_df['Username'].str.strip()
                users_df['Password'] = users_df['Password'].str.strip()
                
                user_match = users_df[(users_df['Username'] == u) & (users_df['Password'] == p)]
                
                if not user_match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user = u
                    st.session_state.role = user_match.iloc[0]['Role']
                    st.rerun()
                else:
                    st.error("Ghalat ID ya Password. Baraye meharbani check karein.")
            else:
                st.error("Sheet se data nahi mil raha. Permission check karein.")
        st.markdown("</div>", unsafe_allow_html=True)

# --- APP MAIN LOGIC ---
if not st.session_state.logged_in:
    show_login()
else:
    # First-time Password Change Logic
    if st.session_state.user != 'admin' and "12345" in get_sheet_data("USERS CREDENTIALS!A:C").query(f"Username == '{st.session_state.user}'")['Password'].values:
        st.warning("⚠️ Security: Pehli baar login par apna password badlein.")
        new_pass = st.text_input("Naya Password", type="password")
        if st.button("Password Update"):
            if update_password_in_sheet(st.session_state.user, new_pass):
                st.success("Mubarak ho! Password badal gaya. Ab dobara login karein.")
                st.session_state.logged_in = False
                st.rerun()
    else:
        # Main Dashboards
        st.sidebar.success(f"Logged in as: {st.session_state.user} ({st.session_state.role})")
        
        if st.session_state.role == "HOD" or st.session_state.user == "admin":
            st.title("🛡️ HOD / ADMIN DASHBOARD")
            tabs = st.tabs(["Overview", "Faculty Records", "Attendance Analytics", "System Settings"])
            with tabs[0]:
                st.write("Mardan Institute ki summary yahan nazar aayegi.")
        
        elif st.session_state.role == "Teacher":
            st.title("🎓 FACULTY PANEL")
            option = st.sidebar.selectbox("Menu", ["Mark Attendance", "My Lectures", "Student List"])
            st.write(f"Aap abhi **{option}** section mein hain.")
            
        if st.sidebar.button("Logout"):
            st.session_state.logged_in = False
            st.rerun()
