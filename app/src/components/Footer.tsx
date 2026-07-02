import Link from "next/link"

const linkGroups = [
  {
    title: "Navigate",
    links: [
      { label: "Features", href: "#features" },
      { label: "Preview", href: "#preview" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Instagram", href: "https://instagram.com/1section_com" },
      { label: "YouTube", href: "https://youtube.com/@1section_com" },
      { label: "TikTok", href: "https://tiktok.com/@1section_com" },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <Link href="/">
              <img src="/1section.svg" alt="1section" className="h-8 w-auto" />
            </Link>
            <p className="text-sm leading-relaxed text-white/40 max-w-xs">
              A thinking library of mental models, audio lessons, and knowledge
              graphs.
            </p>
            <p className="text-xs text-white/30">
              Master your thinking library.
            </p>
          </div>

          {linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-white/30">
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/40 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} 1section. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
