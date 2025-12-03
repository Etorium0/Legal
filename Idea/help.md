\subsection{Method for Integrating LLMs into Knowledge Bases}

The process of integrating Large Language Models (LLMs) into Knowledge Bases (KBs) is carried out through a sequential pipeline, designed to leverage the LLMs' capability to analyze and understand natural language for knowledge extraction, triple pattern generation, and use them as the foundation for constructing a complete KB. In our implementation, Research team employ OpenAI ChatGPT (gpt-4o-mini) as the main LLM component for all stages of the pipeline (document standardization, knowledge extraction, query understanding, and answer generation), due to its strong performance on Vietnamese and English legal texts. In the experiments (Section 4), Research team further compare the proposed KB+LLM architecture with standalone ChatGPT (gpt-4o-mini) and Gemini (Gemini 2.5 Pro) to highlight the added value brought by the KB component.

The sequential pipeline involves the following steps, as illustrated in Figure~\ref{fig32}:

\begin{figure}[H]
\includegraphics[width=\textwidth]{fig32.png}
\caption{LLM integration process into KB.} \label{fig32}
\end{figure}

Figure~\ref{fig32} illustrates the complete workflow of integrating LLMs into the knowledge base construction process. The diagram shows the sequential flow from standardized legal documents through knowledge extraction to the final constructed knowledge base, demonstrating how each step contributes to the overall process of transforming unstructured legal texts into structured, queryable knowledge representations.

\vspace{0.75em}
\noindent\textbf{Summary and results.}
The manuscript proposes an LLM–assisted approach for building and querying a legal knowledge base that integrates ontology-based knowledge graphs (OBKG) with LLMs. On the \emph{Law on Social Insurance} corpus, the system achieves an average query accuracy of \textbf{83.16\%}, outperforming standalone ChatGPT and Gemini on a \textbf{71-question} test set.

\vspace{0.5em}
\noindent\textbf{Strengths}
\begin{itemize}
	\item \textbf{Accuracy + explainability:} Combining OBKG with LLMs improves precision and provides structured, inspectable traces (triples, ontology types).
	\item \textbf{Transparent pipeline:} Each stage (standardization, extraction, indexing, querying, generation) is explicitly specified and reproducible.
	\item \textbf{Real-doc evaluation:} Experiments on statutory text with comparisons against ChatGPT/Gemini show promising gains.
\end{itemize}

\vspace{0.25em}
\noindent\textbf{Minor concerns and our responses}
\begin{enumerate}
	\item \textbf{LLM extraction configuration.} We provide implementation-aligned details of how the LLM is used for extraction and refinement (model, prompts, decoding, few-shot policy) in Section~\ref{sec:llm-extract-config}.
	\item \textbf{Test set size.} We acknowledge the \emph{71-question} test set is small and outline our ongoing expansion plan in Section~\ref{sec:testset-limitations}.
	\item \textbf{Scalability evidence.} We report the time/resource metrics to characterize scalability and include a measurement protocol and a results table template in Section~\ref{sec:scalability-metrics}.
\end{enumerate}

\vspace{1em}
\noindent\textbf{Step 1: Standardized legal documents}

The purpose of this step is to standardize legal texts in order to prepare them for effective knowledge extraction. Input data including texts, legal documents, reports, or other structured and unstructured data is standardized through a process that involves converting text to lowercase, identifying segments containing important legal knowledge, and segmenting sentences and keywords to support subsequent processing steps. The output of this step is a standardized dataset ready for knowledge extraction.

\vspace{1em}
\noindent\textbf{Step 2: Extract knowledge}

The purpose of this step is to extract entities, relations, and concepts from the standardized data and represent them as a knowledge graph for querying and reasoning. \textbf{Implementation-wise, extraction follows a hybrid design that mirrors our code (VNCoreNLP + regex with optional LLM augmentation/refinement):}

\begin{itemize}
	\item \textbf{Dependency-based extraction (primary).} Using VNCoreNLP (annotators: \texttt{wseg,pos,parse}), we detect verbal heads and attach subjects/objects via labels \texttt{nsubj/subj}, \texttt{obj/iobj}, \texttt{obl}, and complements \texttt{attr/ccomp/xcomp}. We handle copula \emph{“là”} and passive markers \emph{“bị/được”}. Noun/verb phrases are assembled with modifiers \texttt{nmod, amod, det, compound, name, case, clf}. See extractor functions aligning with this logic in our implementation.
	\item \textbf{Regex fallback + hybrid union.} When dependency parse is unavailable or for higher recall, we apply high-precision regex patterns tailored to Vietnamese statutes (offense headings, liability clauses, rights/obligations, penalty variants), then optionally merge with dependency results and deduplicate.
	\item \textbf{Normalization and post-filtering.} We correct OCR artifacts, unify legal references (e.g., “Điều X”), filter noisy cases (e.g., incomplete Điều mentions), and convert \emph{“phạm” + “tội … (Điều X)”} into a canonical predicate/object (e.g., predicate “lừa đảo”, object “chiếm đoạt tài sản”). Duplicates are removed with loose normalization.
	\item \textbf{Optional LLM stages.} (i) \emph{LLM extraction} augments recall by extracting triples from article-sized chunks; (ii) \emph{LLM refinement} standardizes triple grammar and JSON format. Both are toggleable and run after rule-based stages.
\end{itemize}

The extracted triple patterns (Subject–Relation–Object) populate the KB alongside the ontology. The ontology encodes schema-level concepts, properties, and constraints; triples populate instance-level facts. Importantly, the \emph{core content of user queries is not used to construct the KG}; instead, query structures are matched against these triples during the querying phase (Section 3.3), enabling transparent, explainable answers over the KB.

\vspace{0.75em}
\noindent\textbf{LLM extraction and refinement configuration} \label{sec:llm-extract-config}
In our implementation, the optional LLM component uses Google Gemini with the official SDK and \texttt{model=gemini-2.5-flash}. We do \emph{not} override decoding parameters (temperature, top-$p$); we use the SDK defaults, and we provide \emph{no few-shot exemplars} (zero-shot, instruction-only) to minimize latency and maximize determinism. Prompts are:

\paragraph{Direct extraction (instruction-only).} Input text is chunked by Article and the model is instructed to output \emph{JSON Lines}, one triple per line \{subject, predicate, object\}, with no extra narration:
\begin{verbatim}
Bạn là trợ lý pháp lý. Hãy trích xuất tất cả bộ ba (chủ thể, hành động, đối tượng)
từ đoạn văn bản luật tiếng Việt.
- Chủ thể là danh ngữ (ví dụ: Người, Tòa án, Cơ quan điều tra, Người từ 14–16 tuổi).
- Hành động là động từ/cụm động từ (ví dụ: phạm, bị phạt, có quyền, có nghĩa vụ,
	chịu trách nhiệm hình sự về, được miễn trách nhiệm hình sự).
- Đối tượng là danh ngữ/khái niệm pháp lý; kèm 'Điều X' nếu xuất hiện.
- Trả về theo định dạng JSON Lines, mỗi dòng một JSON với 3 trường:
	subject, predicate, object.
- Không thêm giải thích nào khác.
\end{verbatim}

\paragraph{Refinement (per-triple).} Each triple can be optionally polished to a single JSON object with grammatical cleanup while preserving legal meaning:
\begin{verbatim}
Chuẩn hóa bộ ba tri thức pháp luật tiếng Việt.
SUBJECT: <subject>
PREDICATE: <predicate>
OBJECT: <object>
- Yêu cầu: ngắn gọn, đúng ngữ pháp, giữ nghĩa pháp lý; predicate là động từ/
	cụm động từ; object là cụm danh từ.
Trả về JSON duy nhất dạng {"subject":"...","predicate":"...","object":"..."}
\end{verbatim}

\vspace{0.75em}
\noindent\textbf{Test set size and generalization} \label{sec:testset-limitations}
We acknowledge the current \emph{71-question} evaluation set is limited for broad generalization. We therefore report results as indicative rather than conclusive and are expanding the benchmark to include: (i) additional topics and difficulty tiers, (ii) adversarial patterns (negation, cross-article linking), and (iii) inter-annotator agreement to assess label quality. A larger public set will enable stronger statistical conclusions and fairer comparisons.

\vspace{0.75em}
\noindent\textbf{Scalability metrics and protocol} \label{sec:scalability-metrics}
To substantiate “scalability”, we measure end-to-end throughput on statutory PDFs. For each run we record: page count, character count, extraction mode (\texttt{regex} / \texttt{vncorenlp} / \texttt{hybrid}), LLM usage (extract/refine), wall-clock time, number of triples, and throughput (triples/s). We keep extraction CPU-bound; LLM calls use hosted API. Table~\ref{tab:scalability} summarizes representative runs (to be filled with measured values).

\begin{table}[H]
	\centering
	\caption{Scalability summary on representative PDFs.}
	\label{tab:scalability}
	\begin{tabular}{lrrrrlll}
			oprule
		PDF & Pages & Chars & Mode & LLM & Time (s) & Triples & Triples/s \\
		\midrule
		<Doc A> & <P> & <C> & regex & none & <t> & <n> & <n/t> \\
		<Doc B> & <P> & <C> & vncorenlp & refine & <t> & <n> & <n/t> \\
		<Doc C> & <P> & <C> & hybrid & extract+refine & <t> & <n> & <n/t> \\
		\bottomrule
	\end{tabular}
\end{table}

\noindent\emph{Reproducibility notes.} We run the extractor with and without LLM toggles (\texttt{--gemini-extract}, \texttt{--gemini}) and gather per-run time using standard timing tools. The script provides debug outputs (extracted characters, active mode); we aggregate results into the table above.