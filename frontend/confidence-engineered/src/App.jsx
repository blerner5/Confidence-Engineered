import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";

import { useMemo, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import MicRoundedIcon from '@mui/icons-material/MicRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import { endInterviewSession, respondInterviewSession, startInterviewSession } from './api/sessionApi'

const SUGGESTED_TOPICS = [
  'Teamwork',
  'Leadership',
  'Conflict Resolution',
  'Problem Solving',
  'Communication',
  'Ownership',
]

const INITIAL_FORM = {
  jobDescription:
    'Senior Software Engineer role building reliable backend APIs and partnering closely with product and design teams.',
  background:
    'I am a backend engineer with 3 years of experience in Python, Flask, SQL, and distributed systems.',
  topics: ['Teamwork', 'Leadership', 'Problem Solving'],
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f4c81' },
    secondary: { main: '#1f7a8c' },
    background: { default: '#eef3f8', paper: '#ffffff' },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Manrope", "Inter", "Segoe UI", sans-serif',
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
})

function normalizeTopic(value) {
  return value.trim().replace(/\s+/g, ' ')
}

function extractSessionId(payload) {
  return payload?.session_id || payload?.sessionId || payload?.data?.session_id || ''
}

function extractInterviewerText(payload) {
  const candidates = [
    payload?.interviewer_message,
    payload?.question,
    payload?.next_question,
    payload?.response,
    payload?.ai_response,
    payload?.message,
    payload?.prompt,
    payload?.data?.interviewer_message,
    payload?.data?.question,
    payload?.data?.response,
  ]
  return candidates.find((item) => typeof item === 'string' && item.trim()) || ''
}

function buildFeedbackRows(payload) {
  const source = payload?.scores || payload?.feedback || payload?.data?.feedback || payload
  if (!source || typeof source !== 'object') return []

  const preferredOrder = ['Clarity', 'Relevance', 'Structure', 'Confidence', 'Depth']
  const keys = Object.keys(source)
  const ordered = [
    ...preferredOrder.filter((label) => keys.includes(label) || keys.includes(label.toLowerCase())),
    ...keys.filter(
      (key) => !preferredOrder.some((label) => label.toLowerCase() === key.toLowerCase()),
    ),
  ]

  return ordered
    .map((key) => {
      const raw = source[key] ?? source[key.toLowerCase()]
      if (raw == null) return null
      if (typeof raw === 'number') return { label: key, score: raw, comment: '' }
      if (typeof raw === 'object') {
        return {
          label: key,
          score: raw.score ?? raw.value ?? raw.rating ?? '-',
          comment: raw.comment ?? raw.notes ?? raw.feedback ?? '',
        }
      }
      return { label: key, score: '-', comment: String(raw) }
    })
    .filter(Boolean)
}

function InterviewPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [customTopic, setCustomTopic] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [responseDraft, setResponseDraft] = useState('')
  const [messages, setMessages] = useState([])
  const [feedbackPayload, setFeedbackPayload] = useState(null)
  const [view, setView] = useState('setup')
  const [error, setError] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [isResponding, setIsResponding] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  const feedbackRows = useMemo(() => buildFeedbackRows(feedbackPayload), [feedbackPayload])

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const toggleTopic = (topic) => {
    setForm((current) => {
      const exists = current.topics.includes(topic)
      return {
        ...current,
        topics: exists
          ? current.topics.filter((item) => item !== topic)
          : [...current.topics, topic],
      }
    })
  }

  const addCustomTopic = () => {
    const normalized = normalizeTopic(customTopic)
    if (!normalized) return
    setForm((current) => {
      if (current.topics.some((topic) => topic.toLowerCase() === normalized.toLowerCase())) {
        return current
      }
      return { ...current, topics: [...current.topics, normalized] }
    })
    setCustomTopic('')
  }

  const validateSetup = () => {
    if (!form.jobDescription.trim()) return 'Please add a job description before starting.'
    if (!form.background.trim()) return 'Please add your professional background before starting.'
    if (!form.topics.length) return 'Please select at least one interview topic.'
    return ''
  }

  const handleStartSession = async () => {
    const validationError = validateSetup()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setIsStarting(true)

    try {
      const payload = await startInterviewSession({
        jobDescription: form.jobDescription,
        background: form.background,
        topics: form.topics,
      })

      const nextSessionId = extractSessionId(payload)
      const openingQuestion = extractInterviewerText(payload)

      setSessionId(nextSessionId)
      setMessages(
        openingQuestion
          ? [{ role: 'interviewer', text: openingQuestion }]
          : [],
      )
      setFeedbackPayload(null)
      setView('interview')
    } catch (caughtError) {
      setError(caughtError.message || 'Could not start interview session.')
    } finally {
      setIsStarting(false)
    }
  }

  const handleSendResponse = async () => {
    if (!sessionId) {
      setError('Missing session id. Start a new interview.')
      return
    }

    const message = responseDraft.trim()
    if (!message) return

    setError('')
    setIsResponding(true)

    try {
      const payload = await respondInterviewSession({
        sessionId,
        response: message,
      })
      const interviewerReply = extractInterviewerText(payload)

      setMessages((current) => {
        const next = [...current, { role: 'candidate', text: message }]
        if (interviewerReply) next.push({ role: 'interviewer', text: interviewerReply })
        return next
      })

      setResponseDraft('')
    } catch (caughtError) {
      setError(caughtError.message || 'Could not submit your response.')
    } finally {
      setIsResponding(false)
    }
  }

  const handleEndSession = async () => {
    if (!sessionId) return

    setError('')
    setIsEnding(true)

    try {
      const payload = await endInterviewSession({ sessionId })
      setFeedbackPayload(payload)
      setView('feedback')
    } catch (caughtError) {
      setError(caughtError.message || 'Could not end interview session.')
    } finally {
      setIsEnding(false)
    }
  }

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setCustomTopic('')
    setSessionId('')
    setResponseDraft('')
    setMessages([])
    setFeedbackPayload(null)
    setError('')
    setView('setup')
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background:
            'radial-gradient(circle at 15% 20%, rgba(15,76,129,0.2), transparent 40%), radial-gradient(circle at 85% 10%, rgba(31,122,140,0.2), transparent 45%), #eef3f8',
        }}
      >
        <AppBar position="static" elevation={0} color="transparent">
          <Toolbar sx={{ borderBottom: '1px solid rgba(15,76,129,0.12)' }}>
            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>
              Confidence, Engineered
            </Typography>
            <Box sx={{ ml: 'auto' }}>
              <Button color="primary" startIcon={<RestartAltRoundedIcon />} onClick={handleReset}>
                New Setup
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
          <Grid container spacing={3} alignItems="stretch">
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, border: '1px solid #d4e1ef', height: '100%' }}>
                <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.08em' }}>
                  Interview Coach
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1, mt: 1, mb: 2 }}>
                  Practice with a polished, realistic interview flow.
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Start in demo mode using your live Flask routes via `/api`. The UI is ready for future auth,
                  analytics, and voice upgrades.
                </Typography>
                <Stack spacing={1.5}>
                  {[
                    'Corporate-grade setup experience',
                    'Real-time interview transcript',
                    'Structured feedback-ready session end',
                  ].map((line) => (
                    <Stack key={line} direction="row" spacing={1.2} alignItems="center">
                      <CheckCircleRoundedIcon color="secondary" fontSize="small" />
                      <Typography variant="body2">{line}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, border: '1px solid #d4e1ef' }}>
                {view === 'setup' && (
                  <Stack spacing={2.5}>
                    <Typography variant="h5">New Interview Setup</Typography>
                    <TextField
                      label="Job Description"
                      value={form.jobDescription}
                      onChange={updateForm('jobDescription')}
                      multiline
                      minRows={4}
                      fullWidth
                    />
                    <TextField
                      label="Your Background"
                      value={form.background}
                      onChange={updateForm('background')}
                      multiline
                      minRows={3}
                      fullWidth
                    />

                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Behavioral Topics
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {SUGGESTED_TOPICS.map((topic) => {
                          const active = form.topics.includes(topic)
                          return (
                            <Chip
                              key={topic}
                              label={topic}
                              color={active ? 'primary' : 'default'}
                              variant={active ? 'filled' : 'outlined'}
                              onClick={() => toggleTopic(topic)}
                            />
                          )
                        })}
                        {form.topics
                          .filter((topic) => !SUGGESTED_TOPICS.includes(topic))
                          .map((topic) => (
                            <Chip
                              key={topic}
                              label={topic}
                              color="primary"
                              variant="filled"
                              onDelete={() => toggleTopic(topic)}
                            />
                          ))}
                      </Stack>
                    </Box>

                    <TextField
                      label="Add Custom Topic"
                      value={customTopic}
                      onChange={(event) => setCustomTopic(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addCustomTopic()
                        }
                      }}
                      fullWidth
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={addCustomTopic} edge="end" color="primary">
                                <AddRoundedIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <Button
                      size="large"
                      variant="contained"
                      startIcon={isStarting ? <CircularProgress size={18} color="inherit" /> : <PlayArrowRoundedIcon />}
                      disabled={isStarting}
                      onClick={handleStartSession}
                    >
                      {isStarting ? 'Starting session...' : 'Start Interview Session'}
                    </Button>
                  </Stack>
                )}

                {view === 'interview' && (
                  <Stack spacing={2.5}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                      <Box>
                        <Typography variant="h5">Interview Session Live</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Session: {sessionId || 'Pending id from backend'}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleEndSession}
                        disabled={isEnding}
                        startIcon={isEnding ? <CircularProgress size={18} color="inherit" /> : <CheckCircleRoundedIcon />}
                      >
                        {isEnding ? 'Ending...' : 'End and Get Feedback'}
                      </Button>
                    </Stack>

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        maxHeight: 340,
                        overflowY: 'auto',
                        backgroundColor: '#f9fbfe',
                      }}
                    >
                      <Stack spacing={1.5}>
                        {messages.length === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Waiting for interviewer prompt...
                          </Typography>
                        )}
                        {messages.map((message, index) => (
                          <Card
                            key={`${message.role}-${index}`}
                            variant="outlined"
                            sx={{
                              borderColor:
                                message.role === 'interviewer' ? 'rgba(15,76,129,0.3)' : 'rgba(31,122,140,0.3)',
                              alignSelf: message.role === 'interviewer' ? 'flex-start' : 'flex-end',
                              maxWidth: '92%',
                              backgroundColor: message.role === 'interviewer' ? '#edf4fb' : '#eaf7f9',
                            }}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Typography variant="caption" color="text.secondary">
                                {message.role === 'interviewer' ? 'AI Interviewer' : 'You'}
                              </Typography>
                              <Typography variant="body2">{message.text}</Typography>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Paper>

                    <TextField
                      label="Your Response (Demo Text Input)"
                      value={responseDraft}
                      onChange={(event) => setResponseDraft(event.target.value)}
                      multiline
                      minRows={3}
                      fullWidth
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <Button
                        variant="contained"
                        onClick={handleSendResponse}
                        disabled={isResponding || !responseDraft.trim()}
                        startIcon={isResponding ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}
                      >
                        {isResponding ? 'Submitting...' : 'Send Response'}
                      </Button>
                      <Button variant="outlined" startIcon={<MicRoundedIcon />} disabled>
                        Voice Input Coming Next
                      </Button>
                    </Stack>
                  </Stack>
                )}

                {view === 'feedback' && (
                  <Stack spacing={2}>
                    <Typography variant="h5">Session Feedback</Typography>
                    <Typography color="text.secondary">
                      Results from `/api/session/end` are shown below. This panel is ready for analytics route integration.
                    </Typography>
                    <Divider />

                    {feedbackRows.length > 0 ? (
                      <Grid container spacing={1.5}>
                        {feedbackRows.map((row) => (
                          <Grid key={row.label} size={{ xs: 12, sm: 6 }}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                              <Typography variant="subtitle2" color="primary.main">
                                {row.label}
                              </Typography>
                              <Typography variant="h5" sx={{ my: 0.5 }}>
                                {row.score}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {row.comment || 'No commentary returned.'}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Alert severity="info">Feedback returned, but no score dimensions were found in the payload.</Alert>
                    )}

                    <Stack direction="row" spacing={1.5}>
                      <Button variant="contained" onClick={() => setView('interview')}>
                        Back to Session
                      </Button>
                      <Button variant="outlined" onClick={handleReset}>
                        Start a New Interview
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>

          {error && (
              <Alert sx={{ mt: 3 }} severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}
                    </Container>
                  </Box>
                </ThemeProvider>
              )
            }

            export default App