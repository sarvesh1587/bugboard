import { STATUS, cap } from './meta';

/** Turns an activity document into a readable sentence fragment */
export function describeActivity(a) {
  switch (a.type) {
    case 'created':
      return <>created this issue</>;
    case 'status':
      return (
        <>
          moved <b>{STATUS[a.from]?.label}</b> → <b className="accent">{STATUS[a.to]?.label}</b>
        </>
      );
    case 'assignee':
      if (!a.to) return <>unassigned {a.from ? <b>{a.from}</b> : 'the issue'}</>;
      return a.from ? (
        <>
          reassigned from <b>{a.from}</b> to <b>{a.to}</b>
        </>
      ) : (
        <>
          assigned <b>{a.to}</b>
        </>
      );
    case 'field':
      if (a.field === 'description') return <>edited the description</>;
      return (
        <>
          changed {a.field} {a.from && <>from <b>{cap(String(a.from))}</b> </>}to <b>{cap(String(a.to))}</b>
        </>
      );
    case 'comment':
      return <>left a comment</>;
    case 'attachment':
      return (
        <>
          attached <b>{a.to}</b>
        </>
      );
    default:
      return <>updated the issue</>;
  }
}
