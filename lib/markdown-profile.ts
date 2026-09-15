import type { XUserProfile } from "@/lib/x";
import type { YouTubeProfile } from "@/lib/youtube";

export interface ProfileResult {
  platform: "X" | "YouTube";
  profile: XUserProfile | YouTubeProfile;
}

function escapeInline(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(/([`*_[\]])/g, "\\$1")
    .replaceAll(/\s+/g, " ");
}

function imageMarkdown(label: string, url: string | undefined) {
  if (!url) return "_無_";
  return `[原圖](${url})\n\n![${label}](${url})`;
}

function formatProfile({ platform, profile }: ProfileResult) {
  const title = `${platform} — ${escapeInline(profile.displayName)}`;
  const description = profile.description.trim() || "_無_";

  return [
    `## ${title}`,
    "",
    `- **user ID:** \`${profile.id}\``,
    `- **username:** ${escapeInline(profile.username)}`,
    `- **display name:** ${escapeInline(profile.displayName)}`,
    `- **link:** ${profile.link}`,
    "",
    "### Description",
    "",
    description,
    "",
    "### Profile picture",
    "",
    imageMarkdown(
      `${platform} ${escapeInline(profile.displayName)} profile picture`,
      profile.profilePictureUrl,
    ),
    "",
    "### Banner / cover image",
    "",
    imageMarkdown(
      `${platform} ${escapeInline(profile.displayName)} cover image`,
      profile.coverImageUrl,
    ),
  ].join("\n");
}

export function buildProfileMarkdown(results: ProfileResult[], errors: string[]) {
  const sections = results.map(formatProfile);

  if (errors.length > 0) {
    sections.push(["## 查詢錯誤", "", ...errors.map((error) => `- ${error}`)].join("\n"));
  }

  return `# Profile Watch\n\n${sections.join("\n\n---\n\n")}\n`;
}
