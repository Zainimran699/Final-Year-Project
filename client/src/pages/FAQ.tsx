import { useState } from "react";
import SmartNavbar from "../components/SmartNavbar";
import Footer from "../components/Footer";

// FAQ data — questions and answers about the platform.
const FAQ_ITEMS = [
  {
    question: "What is DriveReady221?",
    answer:
      "DriveReady221 is a UK driving theory and hazard perception training platform. It helps learners prepare for their DVSA theory test with timed practice quizzes, AI-powered explanations, and an instructor booking marketplace.",
  },
  {
    question: "Is DriveReady221 free to use?",
    answer:
      "Yes! Creating an account and taking practice tests is completely free. You can take unlimited theory and hazard perception tests at no cost.",
  },
  {
    question: "How do the theory practice tests work?",
    answer:
      "Each theory test gives you a random set of multiple-choice questions covering road signs, speed limits, safety, and motorway rules. You have 6 minutes to complete the test. After submission, you see your score and can request AI-generated explanations for any wrong answers.",
  },
  {
    question: "What is the hazard perception test?",
    answer:
      "The hazard perception test shows you real driving scenes and asks you to identify developing hazards. You have 5 minutes to answer all questions. Each question has an image and four possible answers. This mirrors the format of the real DVSA hazard perception test.",
  },
  {
    question: "What is the pass mark?",
    answer:
      "The theory test pass mark is 86%, matching the real DVSA standard (43 out of 50). The hazard perception test uses the same threshold to help you practise to the required standard.",
  },
  {
    question: "How do AI explanations work?",
    answer:
      "When you get a question wrong, you can click 'Why is this wrong?' to receive an AI-generated explanation. The system uses Google Gemini to produce clear, educational explanations tailored to your specific answer. Explanations are cached, so repeated requests are instant.",
  },
  {
    question: "How do I book a driving lesson?",
    answer:
      "Navigate to 'Find Instructor' from your dashboard. You can search by location, view instructor profiles (bio, hourly rate, coverage area), and see their available time slots. Click 'Book' on any available slot to confirm your lesson instantly.",
  },
  {
    question: "Can I cancel a booking?",
    answer:
      "Yes. Go to 'My Bookings' from your dashboard and click 'Cancel' on any confirmed booking. The time slot will be released back to the instructor's availability for other learners to book.",
  },
  {
    question: "I'm a driving instructor. How do I join?",
    answer:
      "Register as an instructor using the sign-up form. Once registered, you can set up your profile (bio, location, hourly rate) and add your available time slots. Learners in your area will be able to find and book you directly through the platform.",
  },
  {
    question: "How do I track my progress?",
    answer:
      "Your 'My Progress' page shows a complete history of all tests you've taken, including scores, time taken, and pass/fail status. Summary cards show your overall pass rate, average score, and best score for both theory and hazard tests.",
  },
];

export default function FAQ() {
  // Track which FAQ item is expanded (accordion style).
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SmartNavbar />

      <main className="flex-1 py-16">
        <div className="max-w-3xl mx-auto px-6">
          {/* Page header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Frequently Asked Questions
            </h1>
            <p className="text-gray-500">
              Everything you need to know about using DriveReady221.
            </p>
          </div>

          {/* FAQ accordion */}
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4"
                >
                  <span className="font-medium text-gray-900">
                    {item.question}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Still have questions CTA */}
          <div className="mt-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Still have questions?
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Can&apos;t find what you&apos;re looking for? Get in touch and
              we&apos;ll be happy to help.
            </p>
            <a
              href="/contact"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              Contact Us
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
