import PlaceholderPage from "../components/PlaceholderPage";

// Placeholder — instructor-side bookings view is a later phase. Backend
// routes under /api/bookings already expose this data with role checks.
export default function InstructorBookings() {
  return (
    <PlaceholderPage
      title="My Bookings"
      subtitle="Upcoming and past lessons booked by your learners"
    />
  );
}
