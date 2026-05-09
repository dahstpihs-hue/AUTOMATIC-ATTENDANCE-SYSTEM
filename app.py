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
        margin-bottom: 10px;
    }
    
    .gateway-master { 
        background-color: #001d3d; 
        padding: 30px; 
        border-radius: 20px; 
        border: 2px solid #FFD700; 
        box-shadow: 0px 10px 40px rgba(0,0,0,0.9);
        text-align: center;
        margin-bottom: 30px;
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

# --- 3. DATABASE FUNCTIONS ---
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
        df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
        return df
    except Exception as e:
        st.error(f"Database Error: {e}")
        return pd.DataFrame()

def save_attendance(rows):
    try:
        service = get_service()
        body = {'values': rows}
        service.spreadsheets().values().append(
            spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:R",
            valueInputOption="RAW", body=body).execute()
        return True
    except Exception as e:
        st.error(f"Save Error: {e}")
        return False

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

# --- 5. AUTHENTICATION LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    users_df = get_data("'USERS CREDENTIALS'!A:F")
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.subheader("🔒 SECURE ACCESS LOGIN")
        role_selection = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'FACULTY MEMBER', 'STUDENT'])
        
        if role_selection in ['HOD', 'COORDINATOR']:
            pass_input = st.text_input("PASSWORD", type="password")
            if st.button("AUTHORIZE"):
                match = users_df[(users_df['Role'].str.contains(role_selection, case=False, na=False)) & (users_df['Password'] == pass_input.strip())]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user_data = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("Invalid Password")

        elif role_selection == 'FACULTY MEMBER':
            fac_list = users_df[users_df['Role'].str.contains('Faculty', case=False, na=False)]['Full Name'].tolist()
            selected_fac = st.selectbox("SELECT YOUR NAME:", fac_list)
            f_pass = st.text_input("PASSWORD", type="password")
            if st.button("VERIFY"):
                match = users_df[(users_df['Full Name'] == selected_fac) & (users_df['Password'] == f_pass.strip())]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user_data = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("Invalid Credentials")

# --- 6. DASHBOARD & ATTENDANCE SYSTEM ---
else:
    user = st.session_state.user_data
    st.sidebar.success(f"Verified: {user['Full Name']}")
    st.title(f"🛡️ {user['Role']} Dashboard")

    # ATTENDANCE MARKING SYSTEM
    if any(role.strip().lower() in ['hod', 'coordinator', 'faculty'] for role in user['Role'].split(',')):
        st.header("📝 Mark Student Attendance")
        
        # Load Student Data
        students_df = get_data("'STUDENTS LIST'!A:Z")
        
        if not students_df.empty:
            c1, c2 = st.columns(2)
            sel_disc = c1.selectbox("Select Discipline", students_df['DISCIPLINE'].unique())
            sel_batch = c2.selectbox("Select Batch", students_df['BATCH'].unique())
            
            # Filter Students
            filtered_students = students_df[(students_df['DISCIPLINE'] == sel_disc) & (students_df['BATCH'] == sel_batch)]
            semester = filtered_students.iloc[0]['SEMESTER'] if not filtered_students.empty else "N/A"
            
            st.info(f"Marking Attendance for: {sel_disc} | {sel_batch} | Semester: {semester}")
            
            subject = st.text_input("Subject Name (e.g., Anatomy, Physiology)").upper()
            topic = st.text_area("Lecture Topic / Record")
            
            st.markdown("### Student Attendance List")
            attendance_results = []
            
            for i, row in filtered_students.iterrows():
                col_name, col_status = st.columns([3, 2])
                status = col_status.radio(f"{row['STUDENT NAME']}", ["P", "A", "L", "S/L"], horizontal=True, key=f"std_{i}")
                attendance_results.append({
                    "name": row['STUDENT NAME'],
                    "father": row.get('Father Name', 'N/A'),
                    "status": status
                })
            
            if st.button("SUBMIT ATTENDANCE TO DATABASE"):
                if not subject or not topic:
                    st.error("Please enter Subject and Topic before submitting!")
                else:
                    date_now = datetime.now().strftime("%Y-%m-%d")
                    time_now = datetime.now().strftime("%H:%M:%S")
                    final_rows = []
                    
                    for res in attendance_results:
                        fine = 100 if res['status'] == "A" else 0
                        final_rows.append([
                            date_now, time_now, "Day", "Slot", user['Full Name'].upper(), 
                            user['Department'], sel_disc, subject, "Start", "End", 
                            "Duration", topic, res['name'], res['father'], res['status'], 
                            fine, sel_batch, semester
                        ])
                    
                    if save_attendance(final_rows):
                        st.balloons()
                        st.success("✅ CONGRATULATIONS! ALL DATA HAS BEEN RECORDED SUCCESSFULLY.")
        else:
            st.error("Student list not found in Google Sheets!")

    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
