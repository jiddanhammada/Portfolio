const API = 'https://ng92wv73.apicdn.sanity.io/v2025-01-01/data/query/production';

async function query(groq) {
  const res = await fetch(`${API}?query=${encodeURIComponent(groq)}`);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  return (await res.json()).result ?? [];
}

const sized = (url, w) => `${url}?w=${w}&auto=format`;

export async function getPosts() {
  const rows = await query(
    `*[_type=="post"] | order(date desc){title, caption, category, date, "images": images[].asset->url}`
  );
  return rows.map((p) => ({ ...p, images: (p.images ?? []).map((u) => sized(u, 900)) }));
}

export async function getProjects() {
  const rows = await query(
    `*[_type=="project"] | order(date desc){title, type, status, date, period, caption, details, tags, featured, overview, problem, objectives, role, outcome, reflection, links, projectType, roleShort, team, background, problemPoints, successCriteria, timeline, results, limitations, nextSteps, skills, outcomeCaption, "process": process[]{ title, text, "image": image.asset->url }, "outcomeImage": outcomeImage.asset->url, "imageCaptions": images[].caption, "imageDims": images[].asset->metadata.dimensions, "slug": slug.current, "images": images[].asset->url}`
  );
  return rows.map((p) => ({
    ...p,
    rawImages: p.images ?? [],
    gallery: (p.images ?? []).map((u) => sized(u, 1600)),
    images: (p.images ?? []).map((u) => sized(u, 900)),
  }));
}

export async function getAchievements() {
  const rows = await query(
    `*[_type=="achievement"] | order(date desc){title, rank, organizer, date, "photo": photo.asset->url, "hotspot": photo.hotspot, "badge": badge.asset->url}`
  );
  return rows.map((a) => ({
    ...a,
    photo: a.photo ? sized(a.photo, 1200) : '',
    badge: a.badge ? sized(a.badge, 300) : '',
    // the hotspot set in Studio decides which part of the photo stays in view
    pos: a.hotspot ? `${Math.round(a.hotspot.x * 100)}% ${Math.round(a.hotspot.y * 100)}%` : '50% 40%',
  }));
}

// Activity page: richer query (location, organization, photo focal point and size). Home keeps using getPosts().
export const ACTIVITY_GROQ = `*[_type=="post"] | order(date desc, _createdAt desc){ "id": _id, title, caption, category, date, location, organization, description, alt, "images": images[]{ "url": asset->url, "x": hotspot.x, "y": hotspot.y, "w": asset->metadata.dimensions.width, "h": asset->metadata.dimensions.height, "caption": caption } }`;
export const ACTIVITY_URL = `${API}?query=${encodeURIComponent(ACTIVITY_GROQ)}`;
export function getActivityRows() {
  return query(ACTIVITY_GROQ);
}
