import { apiClient } from "../lib/apiClient";

const toQuery = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        query.set(key, value);
    });
    const str = query.toString();
    return str ? `?${str}` : "";
};

export const mentorService = {
    listStudentMentorAssignments: (params = {}) => apiClient.get(`/mentor-assignments${toQuery(params)}`),
    assignStudentToMentor: (payload) => apiClient.post("/mentor-assignments/assign", payload),
    updateStudentMentorAssignment: (assignmentId, payload) =>
        apiClient.patch(`/mentor-assignments/${assignmentId}`, payload),
    unassignStudentMentorAssignment: (assignmentId) =>
        apiClient.post(`/mentor-assignments/${assignmentId}/unassign`, {}),
    deleteStudentMentorAssignment: (assignmentId) => apiClient.delete(`/mentor-assignments/${assignmentId}`),

    listMentorCourseAssignments: (params = {}) =>
        apiClient.get(`/mentor-course-assignments${toQuery(params)}`),
    assignMentorToCourse: (payload) => apiClient.post("/mentor-course-assignments/assign", payload),
    updateMentorCourseAssignment: (assignmentId, payload) =>
        apiClient.patch(`/mentor-course-assignments/${assignmentId}`, payload),
    unassignMentorFromCourse: (assignmentId) =>
        apiClient.post(`/mentor-course-assignments/${assignmentId}/unassign`, {}),
    deleteMentorCourseAssignment: (assignmentId) => apiClient.delete(`/mentor-course-assignments/${assignmentId}`),
};
