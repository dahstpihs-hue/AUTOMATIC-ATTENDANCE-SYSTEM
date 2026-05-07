import streamlit as st
import pandas as pd
from datetime import datetime
import gspread
from google.oauth2.service_account import Credentials

# Page Config
st.set_page_config(page_title="THE AUTOMATIC ATTENDANCE SYSTEM", layout="wide")

# Database Connection
def get_gspread_client():
    scope = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    creds = Credentials.from_service_account_info(st.secrets["gcp_service_account"], scopes=scope)
    return gspread.authorize(creds)

gc = get_gspread_client()
sh = gc.open('AUTOMATIC ATTENDANCE SYSTEM')
student_sheet = sh.worksheet("MASTER STUDENTS LIST")
lecture_sheet = sh.worksheet("LECTURE RECORDS")
history_sheet = sh.worksheet("ATTENDANCE HISTORY")

# Data Load & Auto-Correct RADIOLOGY
df = pd.DataFrame(student_sheet.get_all_records())
df['DISCIPLINE'] = df['DISCIPLINE'].str.strip().str.upper().replace(['RADIOLGOY', 'RAD'], 'RADIOLOGY')

# UI Design
st.markdown("""
    <div style="background-color: #1a5276; padding: 20px; border-radius: 15px; text-align: center; border: 4px solid #117a65;">
        <h1 style="color: white; margin: 0; font-family: sans-serif;">THE AUTOMATIC ATTENDANCE SYSTEM</h1>
        <p style="color: #d1f2eb; font-size: 18px;">Department of Allied Health Sciences</p>
    </div>
""", unsafe_allow_html=True)

with st.container():
    st.write("### 📅 Schedule & Timing")
    col1, col2, col3 = st.columns(3)
    date_val = col1.date_input("Date", datetime.now())
    s_time = col2.selectbox("Start Time", ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM'])
    e_time = col3.selectbox("End Time", ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM'])
    
    t_name = st.text_input("Teacher Name")
    subj = st.text_input("Subject")
    
    disc_list = ['RADIOLOGY', 'MLT', 'DENTAL', 'ANAESTHESIA']
    disc = st.selectbox("Discipline", disc_list)
    sem = st.selectbox("Semester", sorted(df['SEMESTER'].unique().astype(str)))

st.write("### 📖 TODAY'S LECTURE")
topic_desc = st.text_area("What will be discussed today?")

st.write("### 📝 MARK ATTENDANCE")
filtered_students = df[(df['DISCIPLINE'] == disc) & (df['SEMESTER'] == sem)]

attendance_results = {}
if not filtered_students.empty:
    for _, row in filtered_students.iterrows():
        name = row['STUDENT NAME']
        f_name = row['FATHER NAME']
        status = st.radio(f"**{name}** ({f_name})", ["P", "A", "L", "SL"], horizontal=True, key=name)
        attendance_results[name] = {"father": f_name, "status": status}
else:
    st.info("No students found for this selection.")

if st.button("SUBMIT FULL RECORD", use_container_width=True, type="primary"):
    lec_row = [date_val.strftime("%Y-%m-%d"), date_val.strftime("%a").upper(), t_name, subj, "Lecture", disc, "", sem, s_time, e_time, topic_desc]
    lecture_sheet.append_row(lec_row)
    
    all_att = []
    for s_name, info in attendance_results.items():
        all_att.append([date_val.strftime("%Y-%m-%d"), date_val.strftime("%a").upper(), datetime.now().strftime("%H:%M:%S"), t_name, subj, topic_desc, disc, "", sem, s_name, info['father'], info['status']])
    
    history_sheet.append_rows(all_att)
    st.balloons()
    st.success("✅ Attendance successfully saved!")
