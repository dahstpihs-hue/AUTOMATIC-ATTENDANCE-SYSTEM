import streamlit as st
import pandas as pd
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="TPIHS | Portal", layout="wide")

SHEET_ID = '124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4'

# --- 2. CONNECTION ---
@st.cache_resource
def init_connection():
    try:
        key_dict = dict(st.secrets["gcp_service_account"])
        creds = Credentials.from_service_account_info(
            key_dict,
            scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        service = build('sheets', 'v4', credentials=creds)
        return service
    except Exception as e:
        st.error(f"Connection Error: {e}")
        return None

service = init_connection()

# --- 3. LOAD DATA ---
@st.cache_data(ttl=60)
def load_data():
    try:
        sheet = service.spreadsheets()
        result = sheet.values().get(
            spreadsheetId=SHEET_ID,
            range="USERS_CREDENTIALS!A:Z"
        ).execute()
        values = result.get('values', [])
        df_users = pd.DataFrame(values[1:], columns=values[0])
        return df_users
    except Exception as e:
        st.error(f"🚨 ERROR: {str(e)}")
        st.exception(e)
        st.stop()

if service:
    df_users = load_data()
    st.success("✅ SYSTEM CONNECTED!")

# --- 4. SIMPLE LOGIN ---
st.title("🎓 ALLIED HEALTH SCIENCES PORTAL")

with st.form("login"):
    u = st.text_input("Username")
    p = st.text_input("Password", type="password")
    if st.form_submit_button("LOGIN"):
        match = df_users[(df_users['Username'].astype(str) == u.strip()) & (df_users['Password'].astype(str) == p.strip())]
        if not match.empty:
            st.success(f"Khush Amdeed {u}!")
            st.balloons()
        else:
            st.error("Ghalat Username/Password")
