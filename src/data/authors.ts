export interface Author {
  name: string;
  avatar: string;
}

export const authors: Record<string, Author> = {
  yohann_mgt: {
    name: "Yohann",
    avatar: "/images/profile-pictures/yohann_mgt.png",
  },
  aquesau: {
    name: "Elwann",
    avatar: "/images/profile-pictures/aquesau.png",
  },
  godlyjaaaj: {
    name: "Sébastien",
    avatar: "/images/profile-pictures/godlyjaaaj.png",
  },
  thorin_kauffmann: {
    name: "Marion",
    avatar: "/images/profile-pictures/thorin_kauffmann.png",
  },
  reyfz: {
    name: "Rémi",
    avatar: "/images/profile-pictures/reyfz.png",
  },
};

export function getAuthor(id: string): Author | undefined {
  return authors[id];
}
