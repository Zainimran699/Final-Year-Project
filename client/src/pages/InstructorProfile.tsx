import PlaceholderPage from "../components/PlaceholderPage";

// Placeholder — real profile editor is a later phase. Backend routes
// under /api/instructors/:id and PUT /api/instructors/me already exist.
export default function InstructorProfile() {
  return (
    <PlaceholderPage
      title="My Profile"
      subtitle="Update your bio, hourly rate, and coverage area"
    />
  );
}
