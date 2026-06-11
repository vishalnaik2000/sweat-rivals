import Placeholder from '../components/Placeholder'

export default function Today() {
  return (
    <Placeholder title="Today">
      Log today&apos;s metrics here. This replaces the old single-file app&apos;s Today view —
      inputs will be driven by the user&apos;s subscribed metrics (see <code>user_metrics</code> in
      SCHEMA.md).
    </Placeholder>
  )
}
