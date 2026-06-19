import React from "react";
import Image from "next/image";

interface ProfileHeaderProps {
  displayName: string | null;
  username: string;
  image: string | null;
  joinedAt: string;
}

export default function ProfileHeader({ displayName, username, image, joinedAt }: ProfileHeaderProps) {
  const joined = new Date(joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="profile-header">
      <div className="profile-avatar">
        {image ? (
          <Image src={image} alt={username} fill sizes="80px" className="profile-avatar-img" />
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          </svg>
        )}
      </div>
      <div className="profile-meta">
        <h1 className="profile-display-name">{displayName || `@${username}`}</h1>
        <p className="profile-username">@{username}</p>
        <p className="profile-joined">Joined {joined}</p>
      </div>
    </div>
  );
}
