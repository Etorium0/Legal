import React from 'react';

type Reference = { title: string; url: string };
type Props = {
  answer: string;
  references?: Reference[];
};

export const ResponseCard: React.FC<Props> = ({ answer, references = [] }) => 
{
  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow p-4 mt-4">
      <div className="text-gray-800 whitespace-pre-wrap">{answer}</div>
      {references.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-semibold text-gray-600">Legal References</div>
          <ul className="mt-2 space-y-2">
            {references.map((r, i) => (
              <li key={i}>
                <a href={r.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResponseCard;
