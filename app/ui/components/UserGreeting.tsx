"use client";
import { displayName, useAuth } from "../../auth/AuthProvider";

export default function UserGreeting() {
  const { user } = useAuth();
  return (
    <div className="my-4">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        Hello {displayName(user)}
      </h1>
      <p className="ml-1 mt-1 text-sm tracking-wide text-gray-500">
        Nothing practiced today and that&apos;s okay.
      </p>
    </div>
  );
}
