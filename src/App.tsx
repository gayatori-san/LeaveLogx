import { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Form, 
  Table, 
  Badge, 
  Navbar, 
  Nav, 
  Modal, 
  Alert,
  Spinner
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { 
  LogOut, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  User, 
  Shield,
  Home,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

// --- Types ---
type LeaveType = 'Home Visit' | 'Outing' | 'Emergency';
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

interface LeaveRequest {
  id: number;
  user_id: number;
  student_name: string;
  type: LeaveType;
  from_date: string;
  to_date: string;
  reason: string;
  status: LeaveStatus;
  warden_comments: string | null;
  created_at: string;
}

interface UserSession {
  id: number;
  role: 'student' | 'warden';
  name: string;
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth State
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [parentContact, setParentContact] = useState('');

  // Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('Outing');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (session) {
      fetchRequests();
    }
  }, [session]);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch (err) {
      console.error('Session check failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/leaves');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch requests');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { username, password } 
      : { username, password, name, role: 'student', room_no: roomNo, parent_contact: parentContact };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        if (isLogin) {
          setSession(data);
        } else {
          setIsLogin(true);
          setError('Registration successful! Please login.');
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession(null);
    setRequests([]);
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: leaveType, from_date: fromDate, to_date: toDate, reason })
      });
      if (res.ok) {
        setShowModal(false);
        setReason('');
        setFromDate('');
        setToDate('');
        fetchRequests();
      }
    } catch (err) {
      console.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: LeaveStatus) => {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchRequests();
    } catch (err) {
      console.error('Update failed');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
              <div className="bg-primary p-4 text-center text-white">
                <Shield size={48} className="mb-3" />
                <h2 className="fw-bold mb-0">Hostel Leave Manager</h2>
                <p className="opacity-75 small">Secure SQL-based Management System</p>
              </div>
              <Card.Body className="p-4">
                {error && <Alert variant={error.includes('successful') ? 'success' : 'danger'}>{error}</Alert>}
                <Form onSubmit={handleAuth}>
                  {!isLogin && (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold">Full Name</Form.Label>
                        <Form.Control required value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" />
                      </Form.Group>
                      <Row>
                        <Col>
                          <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Room No</Form.Label>
                            <Form.Control required value={roomNo} onChange={e => setRoomNo(e.target.value)} placeholder="e.g. 302" />
                          </Form.Group>
                        </Col>
                        <Col>
                          <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Parent Contact</Form.Label>
                            <Form.Control required value={parentContact} onChange={e => setParentContact(e.target.value)} placeholder="Phone number" />
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold">Username</Form.Label>
                    <Form.Control required value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold">Password</Form.Label>
                    <Form.Control required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
                  </Form.Group>
                  <Button variant="primary" type="submit" className="w-100 py-2 fw-bold rounded-pill shadow-sm">
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Button>
                </Form>
                <div className="text-center mt-4">
                  <button onClick={() => setIsLogin(!isLogin)} className="btn btn-link text-decoration-none small">
                    {isLogin ? "Don't have an account? Register as Student" : 'Already have an account? Sign In'}
                  </button>
                </div>
              </Card.Body>
            </Card>
            <div className="text-center mt-3 text-muted small">
              <p>Warden Login: <strong>warden</strong> / <strong>warden123</strong> (if seeded)</p>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <Navbar bg="white" expand="lg" className="shadow-sm border-bottom py-3">
        <Container>
          <Navbar.Brand href="#" className="fw-bold text-primary d-flex align-items-center gap-2">
            <Shield size={24} />
            <span>Hostel Portal</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center gap-3">
              <div className="d-flex align-items-center gap-2 bg-light px-3 py-1 rounded-pill">
                <User size={16} className="text-muted" />
                <span className="small fw-bold">{session.name}</span>
                <Badge bg="primary" className="text-uppercase" style={{ fontSize: '10px' }}>{session.role}</Badge>
              </div>
              <Button variant="outline-danger" size="sm" onClick={handleLogout} className="rounded-pill px-3">
                <LogOut size={14} className="me-1" /> Logout
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-0">{session.role === 'student' ? 'My Leave Requests' : 'Warden Dashboard'}</h2>
            <p className="text-muted small mb-0">
              {session.role === 'student' ? 'Manage your outing and home visit applications' : 'Review and approve student leave requests'}
            </p>
          </div>
          {session.role === 'student' && (
            <Button variant="primary" onClick={() => setShowModal(true)} className="rounded-pill px-4 shadow-sm">
              <Plus size={18} className="me-1" /> New Request
            </Button>
          )}
        </div>

        <Row>
          <Col>
            {requests.length === 0 ? (
              <Card className="border-0 shadow-sm rounded-4 text-center py-5">
                <Card.Body>
                  <Clock size={48} className="text-muted opacity-25 mb-3" />
                  <h5 className="text-muted">No requests found</h5>
                  {session.role === 'student' && <p className="small text-muted">Submit your first leave request to see it here.</p>}
                </Card.Body>
              </Card>
            ) : (
              <div className="table-responsive bg-white rounded-4 shadow-sm border overflow-hidden">
                <Table hover className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="px-4 py-3 small text-uppercase text-muted fw-bold">Type</th>
                      {session.role === 'warden' && <th className="py-3 small text-uppercase text-muted fw-bold">Student</th>}
                      <th className="py-3 small text-uppercase text-muted fw-bold">Duration</th>
                      <th className="py-3 small text-uppercase text-muted fw-bold">Reason</th>
                      <th className="py-3 small text-uppercase text-muted fw-bold">Status</th>
                      {session.role === 'warden' && <th className="px-4 py-3 small text-uppercase text-muted fw-bold text-end">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req.id}>
                        <td className="px-4">
                          <div className="d-flex align-items-center gap-2">
                            {req.type === 'Home Visit' ? <Home size={16} className="text-primary" /> : <Clock size={16} className="text-info" />}
                            <span className="fw-bold small">{req.type}</span>
                          </div>
                        </td>
                        {session.role === 'warden' && (
                          <td>
                            <div className="small fw-bold">{req.student_name}</div>
                            <div className="text-muted" style={{ fontSize: '11px' }}>ID: #{req.user_id}</div>
                          </td>
                        )}
                        <td>
                          <div className="small d-flex align-items-center gap-1">
                            <Calendar size={12} className="text-muted" />
                            {format(new Date(req.from_date), 'MMM d, h:mm a')}
                          </div>
                          <div className="small text-muted d-flex align-items-center gap-1">
                            <ChevronRight size={10} />
                            {format(new Date(req.to_date), 'MMM d, h:mm a')}
                          </div>
                        </td>
                        <td>
                          <div className="small text-muted text-truncate" style={{ maxWidth: '200px' }}>{req.reason}</div>
                        </td>
                        <td>
                          <Badge 
                            bg={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'danger' : 'warning'}
                            className="rounded-pill px-3 py-2"
                            style={{ fontSize: '11px' }}
                          >
                            {req.status}
                          </Badge>
                        </td>
                        {session.role === 'warden' && (
                          <td className="px-4 text-end">
                            {req.status === 'Pending' ? (
                              <div className="d-flex gap-2 justify-content-end">
                                <Button variant="success" size="sm" className="rounded-pill px-3" onClick={() => handleUpdateStatus(req.id, 'Approved')}>
                                  Approve
                                </Button>
                                <Button variant="outline-danger" size="sm" className="rounded-pill px-3" onClick={() => handleUpdateStatus(req.id, 'Rejected')}>
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted small italic">Processed</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Col>
        </Row>
      </Container>

      {/* New Request Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="rounded-4">
        <Modal.Header closeButton className="border-0 px-4 pt-4">
          <Modal.Title className="fw-bold">New Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 pb-4">
          <Form onSubmit={handleSubmitLeave}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Leave Type</Form.Label>
              <Form.Select value={leaveType} onChange={e => setLeaveType(e.target.value as LeaveType)} className="rounded-3">
                <option value="Outing">Outing</option>
                <option value="Home Visit">Home Visit</option>
                <option value="Emergency">Emergency</option>
              </Form.Select>
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">From</Form.Label>
                  <Form.Control required type="datetime-local" value={fromDate} onChange={e => setFromDate(e.target.value)} className="rounded-3" />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">To</Form.Label>
                  <Form.Control required type="datetime-local" value={toDate} onChange={e => setToDate(e.target.value)} className="rounded-3" />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Reason</Form.Label>
              <Form.Control required as="textarea" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Briefly explain your reason..." className="rounded-3" />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 py-2 fw-bold rounded-pill shadow-sm" disabled={submitting}>
              {submitting ? <Spinner size="sm" className="me-2" /> : <Plus size={18} className="me-2" />}
              Submit Application
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
