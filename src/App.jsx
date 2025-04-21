import logo from './assets/cdwl-logo.png';
import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Grid,
  Divider,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import "./App.css";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient({
  authMode: "userPool",
});

export default function App() {
  const [albumTitles, setAlbumTitles] = useState([]);
  const [viewMode, setViewMode] = useState('card');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
const [editForm, setEditForm] = useState({
  name: '',
  title: '',
  notes: ''
});

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const result = await client.models.AlbumTitle.list();
        if (isMounted) {
          setAlbumTitles(result.items);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchInitialData();
  
    const sub = client.models.AlbumTitle.observeQuery().subscribe({
      next: ({ items }) => {
        if (isMounted) {
          console.log('Subscription update received:', items);
          setAlbumTitles(items);
        }
      },
      error: (error) => console.error('Subscription error:', error)
    });
  
    return () => {
      isMounted = false;
      sub.unsubscribe();
    };
  }, []);

  async function createAlbumTitle(event) {
    event.preventDefault();
    setIsLoading(true);
    const form = new FormData(event.target);
    
    const albumData = {
      name: form.get("name") || '',
      title: form.get("title") || '',
      notes: form.get("notes") || null
    };
    
    try {
      const result = await client.models.AlbumTitle.create(albumData);
      setAlbumTitles(prevTitles => [...prevTitles, result]);
      event.target.reset();
    } catch (error) {
      console.error('Error creating album:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteAlbumTitle({ id }) {
    try {
      setIsLoading(true);
      await client.models.AlbumTitle.delete({ id });
      setAlbumTitles(prevTitles => prevTitles.filter(title => title.id !== id));
    } catch (error) {
      console.error('Error deleting album:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Adding edit functionality
async function handleEdit(albumTitle) {
  setEditingId(albumTitle.id);
  setEditForm({
    name: albumTitle.name,
    title: albumTitle.title,
    notes: albumTitle.notes || ''
  });
}

async function handleSave(id) {
  setIsLoading(true);
  try {
    const updatedAlbum = await client.models.AlbumTitle.update({
      id,
      name: editForm.name,
      title: editForm.title,
      notes: editForm.notes || null
    });
    
    setAlbumTitles(prevTitles =>
      prevTitles.map(title =>
        title.id === id ? updatedAlbum : title
      )
    );
    setEditingId(null);
    setEditForm({ name: '', title: '', notes: '' });
  } catch (error) {
    console.error('Error updating album:', error);
  } finally {
    setIsLoading(false);
  }
}

function handleCancel() {
  setEditingId(null);
  setEditForm({ name: '', title: '', notes: '' });
}

  return (
    <Authenticator
      components={{
        Header: () => (
          <Flex
            direction="column"
            justifyContent="center"
            alignItems="center"
            padding="1rem"
          >
          </Flex>
        ),
      }}
    >
      {({ signOut }) => (
        <Flex
          className="App"
          justifyContent="center"
          alignItems="flex-start"
          direction="column"
          width="1280px"
          margin="0 auto"
          padding="2rem"
        >
          {/* Main Container */}
          <Flex
            direction="row"
            justifyContent="center"
            alignItems="flex-start"
            width="100%"
            maxWidth="800px"
            margin="0 auto"
          >
            {/* Left side - Logo */}
            <View width="30%" padding="1rem">
              <img 
                src={logo} 
                className="logo" 
                alt="The Crate Digger's Wishlist" 
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  maxWidth: '300px'
                }}
              />
            </View>

            {/* Right side - Form */}
            <View width="70%" padding="1rem">
              <View as="form" onSubmit={createAlbumTitle}>
                <Flex
                  direction="column"
                  justifyContent="center"
                  gap="2rem"
                  padding="2rem"
                  style={{ maxWidth: '400px', margin: '0 auto' }}
                >
                  <TextField
                    name="name"
                    placeholder="Artist/Band Name"
                    label="Artist/Band Name"
                    labelHidden
                    variation="quiet"
                    required
                    style={{ width: '100%' }}
                  />
                  <TextField
                    name="title"
                    placeholder="Album Title"
                    label="Album Title"
                    labelHidden
                    variation="quiet"
                    required
                    type="text"
                    style={{ width: '100%' }}
                  />
                  <TextField
                    name="notes"
                    placeholder="Notes"
                    label="Notes"
                    labelHidden
                    variation="quiet"
                    type="text"
                    style={{ width: '100%' }}
                  />
                  <Button 
                    type="submit" 
                    variation="primary"
                    style={{ width: 'fit-content', alignSelf: 'center' }}
                  >
                    Add Record
                  </Button>
                </Flex>
              </View>
            </View>
          </Flex>

          {/* Content below */}
          <Flex direction="column" gap="2rem" width="100%" maxWidth="800px" margin="0 auto">
            <Divider />
            <Flex direction="row" alignItems="center" gap="1rem">
              <Heading level={2}>My Vinyl Wishlist</Heading>
              <Button
                onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
                variation="link"
              >
                Switch to {viewMode === 'card' ? 'Table' : 'Card'} View
              </Button>
            </Flex>

            {isLoading ? (
              <View textAlign="center" padding="2rem">
                Loading...
              </View>
            ) : viewMode === 'card' ? (
              <Grid
                margin="3rem 0"
                templateColumns="repeat(auto-fill, minmax(250px, 1fr))"
                gap="2rem"
                justifyContent="center"
              >
              
                {albumTitles && albumTitles.length > 0 ? (
                  albumTitles.map((albumTitle) => (
                    <Flex
                      key={albumTitle.id || albumTitle.name}
                      direction="column"
                      justifyContent="space-between" // This helps maintain consistent spacing
                      alignItems="center"
                      gap="1rem"
                      border="1px solid #ccc"
                      padding="2rem"
                      borderRadius="5%"
                      className="box"
                      style={{
                        minHeight: '300px', // Set a minimum height for consistency
                        width: '250px',     // Set a fixed width for uniformity
                      }}
                    >
                      {/* Top section with name */}
                      <View style={{ width: '100%' }}>
                        {editingId === albumTitle.id ? (
                          <TextField
                            value={editForm.name}
                            onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Artist/Band Name"
                            variation="quiet"
                            required
                          />
                        ) : (
                          <Heading level={3}>{albumTitle.name}</Heading>
                        )}
                      </View>
                
                      {/* Middle section with title and notes */}
                      <Flex direction="column" gap="1rem" style={{ width: '100%', flex: 1 }}>
                        {editingId === albumTitle.id ? (
                          <TextField
                            value={editForm.title}
                            onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Album Title"
                            variation="quiet"
                            required
                          />
                        ) : (
                          <Text fontStyle="italic">{albumTitle.title}</Text>
                        )}
                        
                        {editingId === albumTitle.id ? (
                          <TextField
                            value={editForm.notes}
                            onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Notes"
                            variation="quiet"
                          />
                        ) : (
                          <Text fontSize="small">{albumTitle.notes || " "}</Text> // Add empty space if no notes
                        )}
                      </Flex>
                
                      {/* Bottom section with buttons */}
                      <Flex 
                        direction="row" 
                        gap="1rem"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          marginTop: 'auto' // Pushes buttons to bottom
                        }}
                      >
                        {editingId === albumTitle.id ? (
                          <>
                            <Button
                              variation="primary"
                              onClick={() => handleSave(albumTitle.id)}
                            >
                              Save
                            </Button>
                            <Button
                              variation="link"
                              onClick={handleCancel}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variation="link"
                              onClick={() => handleEdit(albumTitle)}
                            >
                              Edit
                            </Button>
                            <Button
                              variation="destructive"
                              onClick={() => deleteAlbumTitle(albumTitle)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </Flex>
                    </Flex>
                  ))
                ) : (
                  <View textAlign="center" padding="2rem">
                    No records found
                  </View>
                )}
                
                
              </Grid>
            ) : (
              <View width="100%" margin="3rem 0">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'left' }}>Artist/Band Name</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'left' }}>Album Title</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'left' }}>Notes</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {albumTitles && albumTitles.length > 0 ? (
                      albumTitles.map((albumTitle) => (
                        <tr key={albumTitle.id || albumTitle.name}>
                          <td style={{ padding: '1rem', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                            {editingId === albumTitle.id ? (
                              <TextField
                                value={editForm.name}
                                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Artist/Band Name"
                                variation="quiet"
                                required
                              />
                            ) : (
                              albumTitle.name
                            )}
                          </td>
                          <td style={{ padding: '1rem', borderBottom: '1px solid #eee', fontStyle: 'italic', textAlign: 'left' }}>
                            {editingId === albumTitle.id ? (
                              <TextField
                                value={editForm.title}
                                onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Album Title"
                                variation="quiet"
                                required
                              />
                            ) : (
                              albumTitle.title
                            )}
                          </td>
                          <td style={{ padding: '1rem', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                            {editingId === albumTitle.id ? (
                              <TextField
                                value={editForm.notes}
                                onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Notes"
                                variation="quiet"
                              />
                            ) : (
                              albumTitle.notes
                            )}
                          </td>
                          <td style={{ padding: '1rem', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                            {editingId === albumTitle.id ? (
                              <Flex direction="row" gap="1rem" justifyContent="center">
                                <Button
                                  variation="primary"
                                  onClick={() => handleSave(albumTitle.id)}
                                >
                                  Save
                                </Button>
                                <Button
                                  variation="link"
                                  onClick={handleCancel}
                                >
                                  Cancel
                                </Button>
                              </Flex>
                            ) : (
                              <Flex direction="row" gap="1rem" justifyContent="center">
                                <Button
                                  variation="link"
                                  onClick={() => handleEdit(albumTitle)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variation="destructive"
                                  onClick={() => deleteAlbumTitle(albumTitle)}
                                >
                                  Delete
                                </Button>
                              </Flex>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>
                          No records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  
                </table>
              </View>
            )}
            <Button 
              onClick={signOut} 
              style={{ width: 'fit-content', alignSelf: 'center' }}
            >
              Sign Out
            </Button>
          </Flex>
        </Flex>
      )}
    </Authenticator>
  );
}
