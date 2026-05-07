const EditHistory = ({ history = [] }) => (
  <div className="edit-history">
    <h2>Edit History</h2>
    <ul>
      {history.length === 0 && <li>No edits recorded.</li>}
      {history.map((item) => (
        <li key={item.timestamp}>
          <strong>{item.editor}</strong> updated {item.field} on {new Date(item.timestamp).toLocaleString()}
        </li>
      ))}
    </ul>
  </div>
);

export default EditHistory;
