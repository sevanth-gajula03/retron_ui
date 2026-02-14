// Simple Vite env-backed feature flags.
// Enable by setting the corresponding VITE_* variable to "true".

export const featureFlags = {
    // When false, hides the large "No Sections Yet" empty state in Curriculum.
    showCurriculumEmptyState: import.meta.env.VITE_SHOW_CURRICULUM_EMPTY_STATE === "true",
};
