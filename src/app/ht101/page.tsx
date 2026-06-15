import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/Hero";

type Video = {
  title: string;
  creator: string;
  videoId: string;
  note: string;
};

type Lesson = {
  number: number;
  title: string;
  reading: string;
  videos: Video[];
};

export const metadata: Metadata = {
  title: "HIS592 · World Church History I",
  description:
    "Student-facing course hub for HIS592 World Church History I with readings and curated lesson videos.",
};

const lessons: Lesson[] = [
  {
    number: 1,
    title: "Course Map & the Biblical Arc",
    reading: "Gonzalez, Ch. 1-4",
    videos: [
      {
        title:
          "Christianity from Judaism to Constantine: Crash Course World History #11",
        creator: "CrashCourse",
        videoId: "TG55ErfdaeY",
        note: "First 6-8 min",
      },
      {
        title: "Church History in (About) 15 minutes",
        creator: "Breaking In The Habit",
        videoId: "kV6Ao0hAogk",
        note: "First 6-8 min",
      },
      {
        title: "The Ancient Roman World",
        creator: "Ryan M Reeves",
        videoId: "Sa_E9QBHe30",
        note: "First 6-8 min",
      },
      {
        title: "Early Christian Persecution",
        creator: "Ryan M Reeves",
        videoId: "hJR0A9phBc8",
        note: "First 8-10 min",
      },
    ],
  },
  {
    number: 2,
    title: "Persecution, Fathers & Canon",
    reading: "Gonzalez, Ch. 5-12",
    videos: [
      {
        title: "What Is the Didache? The Oldest Christian Teaching Document",
        creator: "THEOENGAGE | Christianity & History",
        videoId: "rHOwc8HjL5E",
        note: "Near the Didache reading moment",
      },
      {
        title: "Saint Ignatius of Antioch, the God Bearer",
        creator: "Trisagion Films",
        videoId: "0JiIgpmjnQg",
        note: "Near the bishop and succession section",
      },
      {
        title: "Justin Martyr: The Philosopher Who Died for Christ",
        creator: "THEOENGAGE | Christianity & History",
        videoId: "nnjJbn32fZs",
        note: "Near Justin and Christian use of culture",
      },
      {
        title: "The Genius of St. Irenaeus",
        creator: "Bishop Robert Barron",
        videoId: "db_30gftdOo",
        note: "Near canon, identity, and continuity",
      },
    ],
  },
  {
    number: 3,
    title: "Constantine, Councils & Augustine",
    reading: "Gonzalez, Ch. 13-24",
    videos: [
      {
        title: "The Council of Nicaea in 5 Minutes",
        creator: "Gospel Simplicity",
        videoId: "urmxOSO1eF8",
        note: "Full 5:19",
      },
      {
        title: "Church Ecumenical Councils Explained: Nicaea to Chalcedon",
        creator: "THEOENGAGE | Christianity & History",
        videoId: "RqZwWn46vEc",
        note: "First 6-8 min",
      },
      {
        title: "Augustine: A Survey of Church History with W. Robert Godfrey",
        creator: "Ligonier Ministries",
        videoId: "LwiA5tt_vxQ",
        note: "First 6-8 min",
      },
      {
        title: "Augustine and Pelagius",
        creator: "Reformed Forum",
        videoId: "dJVFvLYhFvQ",
        note: "Full 8:06",
      },
    ],
  },
  {
    number: 4,
    title: "Gregory, Charlemagne & Medieval Power",
    reading: "Gonzalez, Ch. 25-31",
    videos: [
      {
        title: "Gregory the Great - The First Medieval Pope",
        creator: "Dr. Pardon Mwansa",
        videoId: "4enro5ObpTE",
        note: "First 6-8 min",
      },
      {
        title: "Charlemagne: How He Changed History Forever",
        creator: "Captivating History",
        videoId: "o0qFeEZ7Wd8",
        note: "First 4-6 min",
      },
      {
        title: "Dr. Andrew Jones: An Overview of the Fourth Lateran Council",
        creator: "Franciscan University of Steubenville",
        videoId: "eiTN9DwpV04",
        note: "Full 5:44",
      },
      {
        title: "What are Catholic Indulgences?",
        creator: "Ryan M Reeves",
        videoId: "r-oY7XoO4EU",
        note: "Full 6:55",
      },
    ],
  },
  {
    number: 5,
    title: "Monasticism, Mission & the Friars",
    reading: "Gonzalez, Ch. 20, 29-32",
    videos: [
      {
        title:
          "The Story of St. Patrick: How Christianity Spread in Ireland | Drive Thru History: Ends of the Earth",
        creator: "Drive Thru History with Dave Stotts",
        videoId: "1jqokxg0wFk",
        note: "Full 4:56",
      },
      {
        title: "7. The Rise of Islam and St. Boniface",
        creator: "Bruce Gore",
        videoId: "z88H0mEEpSU",
        note: "First 6-8 min",
      },
      {
        title: "The Medieval Church: St. Benedict and His Rule",
        creator: "Stuart Squires",
        videoId: "XFoPxLsWIOA",
        note: "First 5-7 min",
      },
      {
        title:
          "How the Friars Saved Christendom (Francis, Dominic, Crusades & the Birth of the West)",
        creator: "Think Catholic",
        videoId: "yxQxiDWXW54",
        note: "First 6-8 min",
      },
    ],
  },
  {
    number: 6,
    title: "Scholasticism, Schism & Pre-Reform",
    reading: "Gonzalez, Ch. 32-34",
    videos: [
      {
        title: "What is Scholasticism? Origins and History Explained",
        creator: "THEOENGAGE | Christianity & History",
        videoId: "F24azKdgm7I",
        note: "Full 10:37 or first 5-6 min",
      },
      {
        title: "Early Scholasticism: Anselm, Abelard, and Lombard",
        creator: "Dr. Zachariah Renfro",
        videoId: "ugVkw8pjjTg",
        note: "First 6-8 min",
      },
      {
        title: "Thomas Aquinas (part 1)",
        creator: "Ryan M Reeves",
        videoId: "xri0AMiAKIo",
        note: "First 6-8 min",
      },
      {
        title: "One Throne, Three Popes: The Great Western Schism",
        creator: "Ryan M Reeves",
        videoId: "ZDvmqpjkkxo",
        note: "First 8-10 min",
      },
    ],
  },
  {
    number: 7,
    title: "Luther & the Reformation",
    reading: "Gonzalez, Ch. 35-37",
    videos: [
      {
        title: "Luther and the Diet of Worms",
        creator: "Ryan M Reeves",
        videoId: "cCWhUKCfgCY",
        note: "First 6-8 min",
      },
      {
        title: "Martin Luther & The Diet of Worms",
        creator: "Lineage Journey",
        videoId: "3C3qRHBtfgc",
        note: "Full 5:16",
      },
      {
        title: "When Martin Luther Discovered Justification by Faith Alone",
        creator: "Open the Bible",
        videoId: "FIqQzRyKrp8",
        note: "Full 7:36",
      },
      {
        title: "Luther and Zwingli at Marburg",
        creator: "Reformed Forum",
        videoId: "7_ZP6TnPs_Y",
        note: "Full 4:53",
      },
    ],
  },
  {
    number: 8,
    title: "Zwingli, Calvin & the Reformed Tradition",
    reading: "Gonzalez, Ch. 38-41",
    videos: [
      {
        title: "The Reformation: Huldrych Zwingli",
        creator: "Presbyterian Foundation",
        videoId: "G0t1XvYeIXY",
        note: "Full 5:28",
      },
      {
        title:
          "CHURCH HISTORY | Class #68: Calvin in Strasbourg and Geneva",
        creator: "File001",
        videoId: "qnGCK0McH2E",
        note: "First 6-8 min",
      },
      {
        title:
          "Calvinism vs Arminianism: Synod of Dort & the Five Points Explained | Church History 111",
        creator: "David Guzik",
        videoId: "00N1SlcuLeI",
        note: "First 6-8 min",
      },
      {
        title:
          "The Synod of Dort (1618-1619): The Canons That Comfort Weary Saints",
        creator: "Church History Hub",
        videoId: "lCK8XJdqxm0",
        note: "First 6-8 min",
      },
    ],
  },
  {
    number: 9,
    title: "English Reformation & Catholic Response",
    reading: "Gonzalez, Ch. 42-45",
    videos: [
      {
        title: "The Life and Death of William Tyndale",
        creator: "Reasonable Theology",
        videoId: "LiQ4JeCC8XI",
        note: "First 6-8 min",
      },
      {
        title: "Dr. Lawson on Tyndale, Rogers, and Marian Martyrs",
        creator: "Deaf Christian Library",
        videoId: "oT0NjVKjxoo",
        note: "Full 7:53",
      },
      {
        title: "Council of Trent in Three Minutes",
        creator: "Matt Fyfield",
        videoId: "hPoeFb3Irqo",
        note: "Full 3:10",
      },
      {
        title:
          "John Bunyan | Reformation Tour of Scotland & England",
        creator: "Puritan Reformed Theological Seminary",
        videoId: "Sqi5vPwi4iE",
        note: "Full 2:45",
      },
    ],
  },
  {
    number: 10,
    title: "War, Enlightenment & Pietism",
    reading: "Gonzalez, Ch. 46-48",
    videos: [
      {
        title: "Ten Minute History - The Thirty Years' War (Short Documentary)",
        creator: "History Matters",
        videoId: "EBLVzdvp8qE",
        note: "Full 10:00 or first 5-6 min",
      },
      {
        title:
          "European Enlightenment: Reason, Revolution, & the Church | Church History 115",
        creator: "David Guzik",
        videoId: "8CESXBGXkc8",
        note: "First 6-8 min",
      },
      {
        title:
          "Pietism Explained: Spener, Francke, & the Heart of True Christianity | Church History 112",
        creator: "David Guzik",
        videoId: "Xx30e4M9MzY",
        note: "First 6-8 min",
      },
      {
        title: "Karl Barth in 5 Minutes",
        creator: "Stephen D. Morrison",
        videoId: "cwOgIpESGVw",
        note: "Full 6:45",
      },
    ],
  },
];

type LensExample = {
  country: string;
  lens1: string;
  lens2: string;
  lens3: string;
};

const lensExamples: LensExample[] = [
  {
    country: "USA",
    lens1:
      "González praises the Voluntary Principle — the church thrives without state support. What he misses: \"marketplace religion,\" where dependence on donations rewards spectacle and populist fervor over theological depth.",
    lens2:
      "Charles Finney and the Second Great Awakening. The cost: loss of liturgical depth — \"new measures\" prioritized individual emotional conversion, fragmenting the church into competing denominations. Interactive element: a revival chorus or altar-call style prayer.",
    lens3:
      "Theme: priesthood of all believers, taken to a lay-led extreme — empowering activism while weakening theological consistency. Class question: does it unify your church, or erode accountability?",
  },
];

export default function Ht101Page() {
  return (
    <div className="space-y-14">
      <Hero
        eyebrow="HIS592 · World Church History I"
        title="Church history for people who want more than a timeline."
        subtitle="Asia Pacific Theological Seminary · Dr. Ang Li · June 20 - July 7, 2026"
        primaryCta={{ href: "/book", label: "Contact Dr. Li" }}
      />

      <section className="mx-auto max-w-4xl rounded-[2rem] border border-line bg-card p-8 shadow-sm shadow-ink/5 sm:p-10">
        <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">
          Course Description
        </h2>
        <div className="mt-5 space-y-4 text-base leading-7 text-muted">
          <p>
            HIS592 traces the church&apos;s story from the post-apostolic world to
            the threshold of modernity, with special attention to theology,
            worship, power, reform, and mission. The aim is not only to know
            what happened, but to see how the church&apos;s past still shapes
            ministry, doctrine, and discernment today.
          </p>
          <p>
            Each lesson pairs textbook reading with short, well-placed video
            breaks that reinforce the teaching flow for class. Required
            textbook: Gonzalez, <em>The Story of Christianity, Vol. 1</em>.
          </p>
        </div>
        <a
          href="/HIS592-Syllabus.pdf"
          download
          className="mt-6 inline-flex rounded-full border border-line bg-paper px-6 py-3 text-sm font-semibold text-ink transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          Download the Syllabus (PDF)
        </a>
      </section>

      <section className="mx-auto max-w-4xl rounded-[2rem] border border-line bg-card p-8 shadow-sm shadow-ink/5 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
          Course Texts
        </p>
        <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink">
          Required and supplemental reading
        </h2>
        <div className="mt-6 space-y-5 text-base leading-7 text-muted">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">
              Required
            </h3>
            <p className="mt-2">
              González, Justo L.{" "}
              <em>
                The Story of Christianity, Volume 1: The Early Church to the
                Dawn of the Reformation.
              </em>{" "}
              Revised and updated ed. HarperOne, 2010.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">
              Supplemental — for country presentations where González is thin
            </h3>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Moffett, Samuel H. <em>A History of Christianity in Asia, Vol. 1.</em>{" "}
                HarperSanFrancisco, 1992.
              </li>
              <li>
                Jenkins, Philip. <em>The Lost History of Christianity.</em>{" "}
                HarperOne, 2008.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">
              Selected bibliography
            </h3>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Irvin, Dale T. and Scott W. Sunquist.{" "}
                <em>History of the World Christian Movement, Vol. 1.</em> Orbis,
                2001.
              </li>
              <li>
                Shelley, Bruce L. <em>Church History in Plain Language.</em> 4th
                ed. Thomas Nelson, 2013.
              </li>
              <li>
                Chua, Tony, comp.{" "}
                <em>History Reader for World Church History I.</em> 2022.
              </li>
            </ul>
          </div>
          <p className="text-sm">
            Copies are available through the APTS library; all titles are in
            print and available from the publishers or any major bookseller.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
              Lessons
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              Readings and video flow for all 10 sessions
            </h2>
          </div>
          <p className="hidden text-sm text-muted md:block">
            Each lesson includes four curated video breaks in teaching order.
          </p>
        </div>

        <div className="space-y-4">
          {lessons.map((lesson) => (
            <details
              key={lesson.number}
              className="group rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5 transition-colors"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
                    Lesson {lesson.number}
                  </p>
                  <div>
                    <h3 className="font-serif text-2xl font-semibold leading-tight text-ink">
                      {lesson.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted">{lesson.reading}</p>
                  </div>
                </div>
                <span className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-xl text-ink transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>

              <div className="mt-6 border-t border-line pt-6">
                <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-muted">
                  <span className="rounded-full bg-paper px-4 py-2">
                    {lesson.reading}
                  </span>
                  <span>4 curated videos in class order</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {lesson.videos.map((video) => (
                    <a
                      key={video.videoId}
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-sm shadow-ink/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-ink/10"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                        alt={video.title}
                        className="aspect-video w-full object-cover"
                        loading="lazy"
                      />
                      <div className="space-y-3 p-5">
                        <div>
                          <h4 className="text-lg font-semibold leading-snug text-ink">
                            {video.title}
                          </h4>
                          <p className="mt-1 text-sm text-muted">
                            {video.creator}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-accent">
                          {video.note}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
            Home Country / Region Presentation · 25%
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            The Three Lenses format
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Groups present 15 minutes on the history of Christianity in their
            home country or region. Every group uses the same three-lens
            structure, so the class can compare across very different
            countries. Groups form in Session 1; discuss your angle and
            sources with Dr. Li by Session 6 (July 4). Large countries (e.g.,
            the Philippines) may form two sub-groups by region, island
            cluster, or denomination.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Lens 1 · 4 min
            </p>
            <h3 className="mt-3 font-serif text-xl font-semibold text-ink">
              González&apos;s Narrative
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              What does González (or the selected bibliography) say about your
              region — and what does he miss? Quote him directly: one thing he
              covers well, one thing he skips, and one reason for the gap. If
              your region barely appears before 1500, that absence is itself
              the data point.
            </p>
          </div>
          <div className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Lens 2 · 6 min
            </p>
            <h3 className="mt-3 font-serif text-xl font-semibold text-ink">
              Primary Tradition or Figure
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Who or what carried Christianity into your country, and what did
              it cost? Use at least one non-González source. If your tradition
              has a hymn, chant, or worship form with historical roots, play
              or sing a fragment — sound anchors the moment in embodied
              memory.
            </p>
          </div>
          <div className="rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Lens 3 · 5 min
            </p>
            <h3 className="mt-3 font-serif text-xl font-semibold text-ink">
              The Inheritance Question
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Pick one theme from González — Constantine&apos;s compromise,
              the monastic impulse, mendicant mission — and say how it arrived
              in your country and what your church did with it. The last 2
              minutes are open for one class question and your response.
            </p>
          </div>
        </div>

        <blockquote className="rounded-[2rem] border border-line bg-paper p-6 text-base italic leading-7 text-ink sm:p-8">
          The Day-1 prompt for every group: &ldquo;What Christian presence
          existed in your country or region before 1500? What was missing and
          why? What historical channels later shaped the church there? Where
          does González help you answer that question, and where does he fail
          you?&rdquo;
        </blockquote>

        <div className="space-y-3">
          <h3 className="font-serif text-2xl font-semibold text-ink">
            Model presentations
          </h3>
          <p className="text-sm text-muted">
            Five worked examples of the Three Lenses format. Use them as
            scaffolding for structure and tone — your group&apos;s judgment
            about what González misses is the part that can&apos;t be
            borrowed.
          </p>
          {lensExamples.map((example) => (
            <details
              key={example.country}
              className="group rounded-[1.5rem] border border-line bg-card p-5 shadow-sm shadow-ink/5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-serif text-xl font-semibold text-ink">
                  {example.country}
                </span>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-lg text-ink transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm leading-6 text-muted">
                <p>
                  <strong className="text-ink">
                    Lens 1 — González&apos;s narrative:
                  </strong>{" "}
                  {example.lens1}
                </p>
                <p>
                  <strong className="text-ink">
                    Lens 2 — Primary tradition or figure:
                  </strong>{" "}
                  {example.lens2}
                </p>
                <p>
                  <strong className="text-ink">
                    Lens 3 — The inheritance question:
                  </strong>{" "}
                  {example.lens3}
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
            Final Project · 40%
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Choose your track at the start of the course
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Both tracks are due July 8, 2026, and both include a brief AI Use
            Report — one paragraph naming what tool you used, how, and what
            you verified manually.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[2rem] border border-line bg-card p-8 shadow-sm shadow-ink/5">
            <h3 className="font-serif text-2xl font-semibold text-ink">
              Ministry Track
            </h3>
            <p className="mt-2 text-sm font-medium text-accent">
              Video (8–10 min) + 1-page ministry memo + AI Use Report
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <p>
                Choose one historical figure from any period of church history
                — including the Puritan or missionary era. Your video should
                present:
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Who they were — their theology, ministry, congregation,
                  family, and failures.
                </li>
                <li>
                  What their life and ministry taught you about your own life
                  or ministry.
                </li>
                <li>
                  At least 1–2 changes in perspective, or things you will do
                  differently as a result.
                </li>
              </ol>
              <p>
                Make it suitable for sharing with your congregation or
                ministry supporters.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-line bg-card p-8 shadow-sm shadow-ink/5">
            <h3 className="font-serif text-2xl font-semibold text-ink">
              Research / PhD Track
            </h3>
            <p className="mt-2 text-sm font-medium text-accent">
              Proposal (4–5 pp.) + 5-min live pitch + 3-min peer Q&amp;A + AI
              Use Report
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <p>
                Write a research proposal for a specific doctoral program,
                including:
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  A gap in the existing historical narrative, with specific
                  González page citations.
                </li>
                <li>
                  Why the gap matters, with a brief evaluation of two existing
                  scholarly works.
                </li>
                <li>Proposed methodology and sources.</li>
                <li>
                  Why this specific program, based on faculty profiles or
                  recent dissertations.
                </li>
              </ol>
              <p>Defend it in a 5-minute pitch with 3 minutes of peer Q&amp;A.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl rounded-[2rem] border border-line bg-card p-8 text-center shadow-sm shadow-ink/5 sm:p-10">
        <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">
          Questions? Talk to Dr. Li
        </h2>
        <p className="mt-4 text-muted">
          Reach out if you need clarification about readings, pacing, or how to
          prepare well for class.
        </p>
        <Link
          href="/book"
          className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-colors duration-200 hover:bg-accent-hover"
        >
          Contact Dr. Li
        </Link>
      </section>
    </div>
  );
}
