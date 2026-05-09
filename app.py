import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account

# --- PAGE CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

# Google Sheets Setup
SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# Colab-Style Professional UI
st.markdown("""
    <style>
    .main { background-color: #f8f9fa; }
    .stButton>button { width: 100%; border-radius: 8px; background-color: #1a73e8; color: white; font-weight: bold; height: 3em; }
    h1 { color: #1a73e8; text-align: center; font-family: 'Segoe UI'; }
    .auth-box { background-color: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    </style>
    """, unsafe_allow_html=True)

def authenticate_sheets():
    try:
        creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
        return build('sheets', 'v4', credentials=creds)
    except Exception as e:
        st.error(f"Authentication Problem: {e}")
        return None

def get_sheet_data(range_name):
    service = authenticate_sheets()
    if service:
        try:
            result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
            values = result.get('values', [])
            if values:
                # Create DataFrame
                df = pd.DataFrame(values[1:], columns=values[0])
                # --- AUTO-CORRECTION FOR COLUMNS ---
                # Remove extra spaces from headers and make them Title Case
                df.columns = df.columns.str.strip()
                # Create a mapping for easy access (handle case-sensitivity)
                cols_map = {col.lower(): col for col in df.columns}
                
                # Rename columns to standard names if they exist in any case
                new_names = {}
                if 'username' in cols_map: new_names[cols_map['username']] = 'Username'
                if 'password' in cols_map: new_names[cols_map['password']] = 'Password'
                if 'role' in cols_map: new_names[cols_map['role']] = 'Role'
                
                df = df.rename(columns=new_names)
                return df
        except Exception as e:
            st.error(f"Data Fetching Error: {e}")
    return pd.DataFrame()

# --- LOGIN LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

def show_login():
    st.markdown("<h1>🎓 ALLIED HEALTH SCIENCES PORTAL</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: gray;'>THE PROFESSIONALS INSTITUTE OF HEALTH SCIENCES, MARDAN</p>", unsafe_allow_html=True)
    
    cols = st.columns([1, 2, 1])
    with cols[1]:
        st.markdown("<div class='auth-box'>", unsafe_allow_html=True)
        u_input = st.text_input("👤 Username").strip()
        p_input = st.text_input("🔑 Password", type="password").strip()
        
        if st.button("Secure Login"):
            users_df = get_sheet_data("USERS CREDENTIALS!A:C")
            
            if not users_df.empty:
                # Final check for required columns after auto-correction
                if 'Username' in users_df.columns and 'Password' in users_df.columns:
                    # Clean data row by row
                    users_df['Username'] = users_df['Username'].astype(str).str.strip()
                    users_df['Password'] = users_df['Password'].astype(str).str.strip()
                    
                    match = users_df[(users_df['Username'] == u_input) & (users_df['Password'] == p_input)]
                    
                    if not match.empty:
                        st.session_state.logged_in = True
                        st.session_state.user = u_input
                        st.session_state.role = match.iloc[0]['Role'] if 'Role' in users_df.columns else "User"
                        st.rerun()
                    else:
                        st.error("❌ Username ya Password ghalat hai!")
                else:
                    st.error("⚠️ Sheet Error: 'Username' ya 'Password' column nahi milay. Sheet headers check karein.")
            else:
                st.error("⚠️ Data Error: Sheet se koi record nahi mila.")
        st.markdown("</div>", unsafe_allow_html=True)

# --- MAIN APP ---
if not st.session_state.logged_in:
    show_login()
else:
    st.sidebar.title(f"Welcome, {st.session_state.user}")
    st.sidebar.info(f"Role: {st.session_state.role}")
    
    st.title(f"🛡️ {st.session_state.role} Dashboard")
    st.write(f"Mardan Institute ka Portal ab active hai. Khush amdeed!")

    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
