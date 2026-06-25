export interface Author {
  name: string;
  avatar: string;
}

// GitHub serves any user's avatar at https://github.com/<login>.png, so an
// author's picture is fetched live and stays in sync automatically: no image is
// committed to the repo. The map key is the internal author id stored on posts;
// the argument below is the author's GitHub login (they can differ).
const githubAvatar = (login: string, size = 200): string =>
  `https://github.com/${login}.png?size=${size}`;

export const authors: Record<string, Author> = {
  yohann_mgt: {
    name: "Yohann",
    avatar: githubAvatar("YohannMgt"),
  },
  aquesau: {
    name: "Elwann",
    avatar: githubAvatar("elwqnn"),
  },
  godlyjaaaj: {
    name: "Sébastien",
    avatar: githubAvatar("GodlyJaaaj"),
  },
  thorin_kauffmann: {
    name: "Marion",
    avatar: githubAvatar("THORINKAUFFMANN"),
  },
  reyfz: {
    name: "Rémi",
    avatar: githubAvatar("RemFdz"),
  },
  ravriely: {
    name: "Ravenne",
    avatar: githubAvatar("Ravriely"),
  },
};

export function getAuthor(id: string): Author | undefined {
  return authors[id];
}
