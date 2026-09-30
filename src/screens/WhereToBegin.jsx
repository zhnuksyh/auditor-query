import { Code, Mono, Section, Step } from './Guide.jsx'

// A worked start on the tutorial case, opened from the bulb icon in the case
// header. It walks the method up to the point of the answer and stops, so it
// never solves Case 01 for the player. The header owns the close control.
export default function WhereToBegin() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8 border-b border-zinc-800 pb-4">
          <h1 className="font-display text-4xl font-black text-zinc-100">WHERE TO BEGIN</h1>
          <p className="mt-2 text-sm text-zinc-500">
            The first query is the hardest one to write. Here is how to open{' '}
            <b className="text-zinc-300">The Leaver</b> without giving its answer away. The same
            moves open every engagement.
          </p>
        </header>

        <Section title="Case 01, step by step">
          <ol className="space-y-4 text-sm leading-relaxed text-zinc-300">
            <Step n="1">
              <b className="text-zinc-100">Turn the control into a question.</b> The Scope says
              ITGC-A04 disables a leaver’s account within one working day, and the memo says the
              exception is an account still enabled after its owner left, and then used. So the
              question is: <i>which leaver’s account was logged into after their last day?</i>
            </Step>
            <Step n="2">
              <b className="text-zinc-100">Start from the population.</b> Find the table listing
              everything the control should have acted on, here everyone who left, and look at it
              whole before you filter anything.
              <Code>{'SELECT * FROM leavers;'}</Code>
            </Step>
            <Step n="3">
              <b className="text-zinc-100">Follow the keys.</b> The Data Map shows{' '}
              <Mono>leavers.person_id</Mono> and <Mono>accounts.person_id</Mono> both point at{' '}
              <Mono>people.id</Mono>. Join on them to put each leaver beside their account.
              <Code>
                {'SELECT l.person_id, l.last_day, a.username, a.status\nFROM leavers l\nJOIN accounts a ON a.person_id = l.person_id;'}
              </Code>
            </Step>
            <Step n="4">
              <b className="text-zinc-100">Narrow with each condition in the memo.</b> More than one
              leaver still has an enabled account, so that alone convicts nobody. Keep the enabled
              ones, then join <Mono>sessions</Mono> and keep only logins dated after{' '}
              <Mono>last_day</Mono>. When exactly one row survives, you have the exception.
            </Step>
            <Step n="5">
              <b className="text-zinc-100">Write down what you proved.</b> The row that survives
              answers a blank on the Finding. Every dropdown there offers several plausible choices,
              so pick the one your results show, not the one that sounds right.
            </Step>
            <Step n="6">
              <b className="text-zinc-100">Let each answer lead to the next.</b> The account you
              found leads to <Mono>entitlements</Mono> (what could it reach?), and that system leads
              to <Mono>access_reviews</Mono> (who signed it off?). Note each fact in the Workpaper
              as you go.
            </Step>
          </ol>
        </Section>

        <Section title="Every engagement after this one">
          <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs leading-relaxed text-zinc-400">
            Every engagement opens the same way: turn the control into a question, start from the
            population, follow the keys, narrow one condition at a time, then write up what you
            found. Stuck on a clause or a term? The Audit Manual (the book icon, or the Tab key) has
            each one with an example.
          </p>
        </Section>
      </div>
    </div>
  )
}
