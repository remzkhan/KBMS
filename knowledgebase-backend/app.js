import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// --- IMPORTANT: Firebase and App Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'knowledgebase-saas-default';
const geminiApiKey = ""; // Handled by the environment.
const BACKEND_URL = "http://localhost:3001"; // The URL of your new backend server

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Jira Integration Modal Component ---
const JiraConnectModal = ({ onClose, onFetch }) => {
    const [jiraDomain, setJiraDomain] = useState('');
    const [jiraEmail, setJiraEmail] = useState('');
    const [jiraApiToken, setJiraApiToken] = useState('');
    const [jqlQuery, setJqlQuery] = useState('status = Done AND resolutiondate >= -30d');
    const [showToken, setShowToken] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const handleFetch = () => {
        setIsConnecting(true);
        onFetch({ domain: jiraDomain, email: jiraEmail, token: jiraApiToken, jqlQuery });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Connect to Jira</h2>
                <p className="text-slate-600 mb-6">Enter your Jira details to fetch ticket data based on a JQL query.</p>
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-slate-700">Jira Domain</label><input type="text" placeholder="your-company.atlassian.net" value={jiraDomain} onChange={(e) => setJiraDomain(e.target.value)} className="mt-1 w-full p-3 border rounded-lg"/></div>
                    <div><label className="text-sm font-medium text-slate-700">Jira Email Address</label><input type="email" placeholder="you@example.com" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} className="mt-1 w-full p-3 border rounded-lg"/></div>
                    <div><label className="text-sm font-medium text-slate-700">API Token</label><div className="relative"><input type={showToken ? 'text' : 'password'} placeholder="Your Jira API Token" value={jiraApiToken} onChange={(e) => setJiraApiToken(e.target.value)} className="mt-1 w-full p-3 border rounded-lg pr-10"/><button onClick={() => setShowToken(!showToken)} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500">{showToken ? 'Hide' : 'Show'}</button></div></div>
                    <div><label className="text-sm font-medium text-slate-700">JQL Query</label><input type="text" value={jqlQuery} onChange={(e) => setJqlQuery(e.target.value)} className="mt-1 w-full p-3 border rounded-lg"/></div>
                </div>
                <div className="mt-8 flex justify-end gap-3"><button onClick={onClose} disabled={isConnecting} className="px-4 py-2 text-sm font-semibold rounded-lg">Cancel</button><button onClick={handleFetch} disabled={!jiraDomain || !jiraEmail || !jiraApiToken || isConnecting} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-indigo-300"> {isConnecting ? 'Connecting...' : 'Connect and Fetch'}</button></div>
            </div>
        </div>
    );
};

// --- Zendesk Integration Modal Component ---
const ZendeskConnectModal = ({ onClose, onFetch }) => {
    const [subdomain, setSubdomain] = useState('');
    const [email, setEmail] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const handleFetch = () => { setIsConnecting(true); onFetch({ subdomain, email, token: apiToken }); };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Connect to Zendesk</h2>
                <p className="text-slate-600 mb-6">Enter your Zendesk details to fetch solved tickets.</p>
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-slate-700">Zendesk Subdomain</label><div className="flex items-center mt-1"><input type="text" placeholder="your-company" value={subdomain} onChange={(e) => setSubdomain(e.target.value)} className="w-full p-3 border rounded-l-lg z-10"/><span className="inline-flex items-center px-3 text-slate-600 bg-slate-50 border border-l-0 rounded-r-md h-[46px]">.zendesk.com</span></div></div>
                    <div><label className="text-sm font-medium text-slate-700">Email Address</label><input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full p-3 border rounded-lg"/></div>
                    <div><label className="text-sm font-medium text-slate-700">API Token</label><div className="relative"><input type={showToken ? 'text' : 'password'} placeholder="Your Zendesk API Token" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className="mt-1 w-full p-3 border rounded-lg pr-10"/><button onClick={() => setShowToken(!showToken)} className="absolute inset-y-0 right-0 px-3 flex items-center">{showToken ? 'Hide' : 'Show'}</button></div></div>
                </div>
                <div className="mt-8 flex justify-end gap-3"><button onClick={onClose} disabled={isConnecting} className="px-4 py-2 text-sm font-semibold rounded-lg">Cancel</button><button onClick={handleFetch} disabled={!subdomain || !email || !apiToken || isConnecting} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-indigo-300">{isConnecting ? 'Connecting...' : 'Connect and Fetch'}</button></div>
            </div>
        </div>
    );
};


// --- Main Application Component ---
function App() {
    const [user, setUser] = useState(null);
    const [articles, setArticles] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [sourceText, setSourceText] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [inputType, setInputType] = useState('text');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
    const [isZendeskModalOpen, setIsZendeskModalOpen] = useState(false);

    useEffect(() => { onAuthStateChanged(auth, async (u) => { if (u) setUser(u); else { try { await signInAnonymously(auth); } catch (e) { setError("Auth failed."); }} setIsAuthReady(true); }); }, []);
    useEffect(() => { if (!isAuthReady || !user) return; const q = collection(db, `artifacts/${appId}/users/${user.uid}/knowledgebase`); const unsub = onSnapshot(q, (snap) => { setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))); }); return unsub; }, [isAuthReady, user]);

    const generateArticleFromText = async (text, source) => {
        if (!text) { setError("Content is empty."); return; }
        setIsLoading(true); setError('');
        const prompt = `Analyze the following content and transform it into a structured knowledge base article. Content: "${text}". Response must be a valid JSON object with schema: { "title": "...", "summary": "...", "content": [ { "heading": "...", "points": ["..."] } ], "keywords": ["..."] }`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }) });
            if (!response.ok) throw new Error(`AI API failed: ${response.status}`);
            const result = await response.json();
            const newArticle = JSON.parse(result.candidates[0].content.parts[0].text);
            await saveArticleToFirestore(newArticle, source);
            setSourceText(''); setSourceUrl('');
        } catch (err) { setError(`Failed to generate article: ${err.message}`); } finally { setIsLoading(false); }
    };
    
    const fetchFromBackend = async (endpoint, body, source) => {
        setIsLoading(true); setError('');
        try {
            const res = await fetch(`${BACKEND_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || `Request failed with status ${res.status}`); }
            const data = await res.json();
            await generateArticleFromText(data.content, source);
        } catch (err) { setError(`Failed to fetch from source: ${err.message}`); setIsLoading(false); }
    };

    const handleJiraFetch = (credentials) => {
        setIsJiraModalOpen(false);
        fetchFromBackend('/api/fetch-jira', credentials, { type: 'jira', value: `Ticket from ${credentials.domain}` });
    };
    
    const handleZendeskFetch = (credentials) => {
        setIsZendeskModalOpen(false);
        fetchFromBackend('/api/fetch-zendesk', credentials, { type: 'zendesk', value: `Ticket from ${credentials.subdomain}.zendesk.com` });
    };

    const generateArticleFromUrl = () => {
        fetchFromBackend('/api/scrape-url', { url: sourceUrl }, { type: 'url', value: sourceUrl });
    };

    const saveArticleToFirestore = async (articleData, source) => {
        if (!user) { setError("You must be signed in."); return; }
        try { await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/knowledgebase`), { ...articleData, source: source || { type: 'text' }, createdAt: new Date().toISOString() }); } catch (err) { setError("Failed to save article."); }
    };

    const handleGenerateClick = () => { if (inputType === 'text') generateArticleFromText(sourceText, { type: 'text' }); else if (inputType === 'url') generateArticleFromUrl(); };
    
    return (
        <div className="bg-slate-50 min-h-screen font-sans text-slate-800">
            {isJiraModalOpen && <JiraConnectModal onClose={() => setIsJiraModalOpen(false)} onFetch={handleJiraFetch} />}
            {isZendeskModalOpen && <ZendeskConnectModal onClose={() => setIsZendeskModalOpen(false)} onFetch={handleZendeskFetch} />}
            <div className="container mx-auto p-4 md:p-8">
                {/* Header and other UI remains the same */}
                <header className="mb-8"><h1 className="text-4xl font-bold">Knowledge Base AI</h1><p className="mt-2 text-slate-600">Transform text, URLs, and support tickets into structured knowledge.</p></header>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 flex flex-col gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h2 className="text-2xl font-semibold mb-4">Create New Article</h2>
                            <div className="mb-4 flex border rounded-lg p-1 bg-slate-100">
                                <button onClick={() => setInputType('text')} className={`flex-1 py-2 text-sm rounded-md ${inputType === 'text' ? 'bg-white shadow text-indigo-600' : ''}`}>Text</button>
                                <button onClick={() => setInputType('url')} className={`flex-1 py-2 text-sm rounded-md ${inputType === 'url' ? 'bg-white shadow text-indigo-600' : ''}`}>URL</button>
                            </div>
                            {inputType === 'text' && ( <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste content..." className="w-full h-40 p-3 border rounded-lg" disabled={isLoading}/> )}
                            {inputType === 'url' && ( <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://example.com/article" className="w-full h-12 p-3 border rounded-lg" disabled={isLoading}/> )}
                            <button onClick={handleGenerateClick} disabled={(!sourceText && inputType==='text') || (!sourceUrl && inputType==='url') || isLoading} className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 rounded-lg disabled:bg-indigo-300">Generate Article</button>
                            <div className="mt-6"><p className="text-xs text-center text-slate-400 mb-3">Or connect a service</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setIsJiraModalOpen(true)} className="bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm py-2 rounded-lg font-semibold">Jira</button>
                                    <button onClick={() => setIsZendeskModalOpen(true)} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-sm py-2 rounded-lg font-semibold">Zendesk</button>
                                    <button disabled className="bg-slate-100 text-slate-400 text-sm py-2 rounded-lg cursor-not-allowed">Slack</button>
                                </div>
                            </div>
                            {error && <p className="text-red-600 text-sm mt-4 p-3 bg-red-50 rounded-lg">{error}</p>}
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h2 className="text-2xl font-semibold mb-4">Knowledge Base</h2>
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                {isLoading && articles.length === 0 ? <p>Loading...</p> : articles.length > 0 ? articles.map(article => ( <div key={article.id} onClick={() => setSelectedArticle(article)} className={`p-4 rounded-lg cursor-pointer ${selectedArticle?.id === article.id ? 'bg-indigo-100 border-l-4 border-indigo-500' : 'hover:bg-slate-100'}`}><h3 className="font-semibold truncate">{article.title}</h3><p className="text-sm text-slate-500 truncate">{article.summary}</p></div> )) : <p className="text-slate-500 text-center py-8">No articles yet.</p>}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="bg-white p-8 rounded-xl shadow-sm border sticky top-8 min-h-[85vh]">
                            {selectedArticle ? ( <div> <h1 className="text-3xl font-bold mb-2">{selectedArticle.title}</h1> <p className="italic mb-6">{selectedArticle.summary}</p> {selectedArticle.content?.map((s, i) => ( <div key={i} className="mb-6"><h2 className="text-xl font-semibold mb-3">{s.heading}</h2><ul className="list-disc list-inside space-y-2">{s.points?.map((p, pi) => <li key={pi}>{p}</li>)}</ul></div> ))} <div className="mt-8 pt-4 border-t"><h3 className="text-lg font-semibold mb-3">Keywords</h3><div className="flex flex-wrap gap-2">{selectedArticle.keywords?.map((k, i) => <span key={i} className="bg-slate-200 px-3 py-1 rounded-full text-sm">{k}</span>)}</div></div> {selectedArticle.source?.value && ( <div className="mt-8 pt-4 border-t text-sm text-slate-500"><p>Source: {selectedArticle.source.type === 'url' ? <a href={selectedArticle.source.value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{selectedArticle.source.value}</a> : <span>{selectedArticle.source.value}</span>}</p></div> )} </div> ) : ( <div className="flex flex-col items-center justify-center h-full text-center"><h2 className="text-2xl font-semibold text-slate-600">Select an article</h2><p className="mt-2">Choose one to see its details.</p></div> )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
