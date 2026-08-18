import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/common/Dashboard";

import AdminLayout from "../layouts/AdminLayout.jsx";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminStudentCreate from "../pages/admin/students/Create.jsx";
import AdminTeacherCreate from "../pages/admin/teachers/Create.jsx";
import AdminNotices from "../pages/admin/Notices";
import AdminStudentList from "../pages/admin/students/List.jsx";
import AdminTeacherList from "../pages/admin/teachers/List.jsx";
import AdminOperations from "../pages/admin/Operations.jsx";
import AdminDepartmentStatus from "../pages/admin/DepartmentStatus.jsx";
import AdminLoginSettings from "../pages/admin/LoginSettings.jsx";
import AdminRoleRightsManager from "../pages/admin/RoleRightsManager.jsx";
import AcademicOperations from "../pages/admin/AcademicOperations.jsx";
import FinancialsAndInventory from "../pages/admin/FinancialsAndInventory.jsx";

import AdminStudentLayout from "../layouts/StudentLayout.jsx";
import StudentOverview from "../pages/student/Overview.jsx";
import StudentFees from "../pages/admin/students/AddFees.jsx";
import StudentReport from "../pages/student/Report.jsx";

import TeacherLayout from "../layouts/TeacherLayout.jsx";
import TeacherDashboard from "../pages/teacher/Dashboard";
import TeacherAttendance from "../pages/teacher/Attendance";
import TeacherNotices from "../pages/teacher/Notices";
import TeacherProfile from "../pages/teacher/Profile";
import AITools from "../pages/teacher/AITools.jsx";
import HomeworkDiary from "../pages/teacher/HomeworkDiary.jsx";
import TeacherTimetable from "../pages/teacher/Timetable.jsx";

import StudentLayout from "../pages/student/Layout";
import Overview from "../pages/student/Overview";
import Attendance from "../pages/student/Attendance";
import Fees from "../pages/student/Fees";
import Notices from "../pages/student/Notices";
import Report from "../pages/student/Report";
import AITutor from "../pages/student/AITutor.jsx";
import Hub from "../pages/student/Hub.jsx";
import StudentTimetable from "../pages/student/Timetable.jsx";

import ParentDashboard from "../pages/parent/ParentDashboard.jsx";

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#030712",
        color: "#38bdf8",
        fontFamily: "sans-serif",
        fontSize: "1.2rem",
        letterSpacing: "1px"
      }}>
        LOADING PORTAL...
      </div>
    );
  }

  const requireAuth = (element) =>
    user ? element : <Navigate to="/login" replace />;

  const requireRole = (roles, element) =>
    user && roles.includes(user.role) ? element : <Navigate to="/" replace />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={requireAuth(<Dashboard />)} />

      <Route path="/admin" element={requireRole(["admin", "coordinator", "head", "md"], <AdminLayout />)}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="notices" element={<AdminNotices />} />
        <Route path="students/create" element={requireRole(["admin"], <AdminStudentCreate />)} />
        <Route path="teachers/create" element={requireRole(["admin"], <AdminTeacherCreate />)} />
        <Route path="students/list" element={<AdminStudentList />} />
        <Route path="teachers/list" element={<AdminTeacherList />} />
        <Route path="attendance" element={requireRole(["admin", "coordinator"], <TeacherAttendance />)} />
        <Route path="department-status" element={requireRole(["admin", "coordinator"], <AdminDepartmentStatus />)} />
        <Route path="login-settings" element={requireRole(["admin"], <AdminLoginSettings />)} />
        <Route path="role-rights" element={requireRole(["admin"], <AdminRoleRightsManager />)} />
        <Route path="operations" element={<AdminOperations />} />
        <Route path="academic-ops" element={<AcademicOperations />} />
        <Route path="financials-inventory" element={<FinancialsAndInventory />} />
      </Route>

      <Route path="/admin/students/:id" element={requireRole(["admin"], <AdminStudentLayout />)}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<StudentOverview />} />
        <Route path="fees" element={<StudentFees />} />
        <Route path="report" element={<StudentReport />} />
      </Route>

      <Route path="/admin/teachers/:id" element={requireRole(["admin"], <TeacherLayout />)}>
        <Route index element={<Navigate to="fees" replace />} />
        <Route path="fees" element={<StudentFees />} />
        <Route path="report" element={<StudentReport />} />
      </Route>

      <Route path="/teacher" element={requireRole(["teacher"], <TeacherLayout />)}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="notices" element={<TeacherNotices />} />
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="ai-tools" element={<AITools />} />
        <Route path="homework-leaves" element={<HomeworkDiary />} />
        <Route path="timetable" element={<TeacherTimetable />} />
      </Route>

      <Route path="/student/:id" element={requireRole(["student"], <StudentLayout />)}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="fees" element={<Fees />} />
        <Route path="notices" element={<Notices />} />
        <Route path="report" element={<Report />} />
        <Route path="ai-tutor" element={<AITutor />} />
        <Route path="hub" element={<Hub />} />
        <Route path="timetable" element={<StudentTimetable />} />
      </Route>

      <Route path="/parent" element={requireRole(["parent"], <ParentDashboard />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

