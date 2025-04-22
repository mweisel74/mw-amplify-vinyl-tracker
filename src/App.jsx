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
  const [isImporting, setIsImporting] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);  // Make sure this is here
  const [selectedItems, setSelectedItems] = useState([]); // And this
  const [editForm, setEditForm] = useState({
    name: '',
    title: '',
    notes: ''
  });
  
   // Add the toggleItemSelection function here
   const toggleItemSelection = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

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

  //Adding bulk delete functionality
const handleBulkDelete = async () => {
  if (selectedItems.length === 0) {
    alert('Please select items to delete');
    return;
  }

  const confirmDelete = window.confirm(
    `Warning: You are about to delete ${selectedItems.length} record(s). This action is irreversible. Do you want to continue?`
  );

  if (confirmDelete) {
    setIsLoading(true);
    try {
      // Create an array of promises for all deletions
      const deletePromises = selectedItems.map(id => 
        client.models.AlbumTitle.delete({ id })
      );

      // Wait for all deletions to complete
      await Promise.all(deletePromises);

      // Update local state after all deletions are complete
      setAlbumTitles(prevTitles => 
        prevTitles.filter(title => !selectedItems.includes(title.id))
      );
      
      setSelectedItems([]); // Clear selections
      setBulkDeleteMode(false); // Exit bulk delete mode
      
      // Force a refresh of the albumTitles state
      const result = await client.models.AlbumTitle.list();
      setAlbumTitles(result.items);
      
    } catch (error) {
      console.error('Error during bulk delete:', error);
      alert('Some items could not be deleted. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }
};



  //Adding import functionality
const handleCSVImport = async (event) => {
  const file = event.target.files[0];
  if (file) {
    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = text.split('\n');
        
        // Validate CSV structure
        if (rows.length < 2) {
          alert('CSV file appears to be empty or invalid');
          setIsImporting(false);
          return;
        }

        const headers = rows[0].toLowerCase().split(',');
        if (!headers.includes('name') || !headers.includes('title')) {
          alert('Your CSV must include column headers for "name,title,notes"');
          setIsImporting(false);
          return;
        }

        const records = rows
          .slice(1)
          .filter(row => row.trim()) // Skip empty rows
          .map((row, index) => {
            const values = row.split(',');
            return {
              rowNumber: index + 2, // +2 because we start after header and want 1-based indexing
              name: values[headers.indexOf('name')]?.trim(),
              title: values[headers.indexOf('title')]?.trim(),
              notes: values[headers.indexOf('notes')]?.trim() || null
            };
          });

        const validRecords = records.filter(record => record.name && record.title);
        const invalidRecords = records.filter(record => !record.name || !record.title);

        // Add valid records to the database
        let successCount = 0;
        for (const record of validRecords) {
          try {
            await client.models.AlbumTitle.create({
              name: record.name,
              title: record.title,
              notes: record.notes
            });
            successCount++;
          } catch (error) {
            console.error('Error saving record:', error);
            invalidRecords.push({ ...record, error: 'Database error' });
          }
        }

        // Prepare error message for invalid records
        let errorMessage = '';
        if (invalidRecords.length > 0) {
          errorMessage = 'The following records were not imported due to missing required fields:\n\n';
          invalidRecords.forEach(record => {
            errorMessage += `Row ${record.rowNumber}: `;
            if (!record.name) errorMessage += '[Missing Artist Name] ';
            if (!record.title) errorMessage += '[Missing Album Title] ';
            if (record.error) errorMessage += `[${record.error}] `;
            errorMessage += '\n';
          });
        }

        // Show results
        const message = `Import Results:\n\n` +
          `Successfully imported: ${successCount} records\n` +
          `Failed to import: ${invalidRecords.length} records\n\n` +
          `${errorMessage}`;

        alert(message);

      } catch (error) {
        console.error('Error processing CSV:', error);
        alert('Error processing CSV file');
      } finally {
        setIsImporting(false);
        event.target.value = ''; // Reset file input
      }
    };

    reader.onerror = () => {
      alert('Error reading file');
      setIsImporting(false);
    };

    reader.readAsText(file);
  }
};



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
              <>
                <Button
                  onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
                  variation="link"
                >
                  Switch to {viewMode === 'card' ? 'Table' : 'Card'} View
                </Button>
                
                <label htmlFor="csvInput" style={{ margin: 0 }}>
                  <Button
                    variation="link"
                    onClick={() => document.getElementById('csvInput').click()}
                    isLoading={isImporting}
                  >
                    {isImporting ? 'Importing...' : 'Import CSV'}
                  </Button>
                </label>
                <input
                  id="csvInput"
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  style={{ display: 'none' }}
                />
              
                <Button
                  variation="link"
                  onClick={() => {
                    setBulkDeleteMode(!bulkDeleteMode);
                    setSelectedItems([]); // Clear selections when toggling mode
                  }}
                >
                  {bulkDeleteMode ? 'Cancel Bulk Delete' : 'Bulk Delete'}
                </Button>
              
                {bulkDeleteMode && selectedItems.length > 0 && (
                  <Button
                    variation="destructive"
                    onClick={handleBulkDelete}
                  >
                    Delete Selected ({selectedItems.length})
                  </Button>
                )}
              </>
              
              
              
              
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
                      justifyContent="space-between"
                      alignItems="center"
                      gap="1rem"
                      border="1px solid #ccc"
                      padding="2rem"
                      borderRadius="5%"
                      className="box"
                      style={{
                        minHeight: '300px',
                        width: '250px',
                      }}
                    >
                      {bulkDeleteMode && (
                        <View style={{ alignSelf: 'flex-start' }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(albumTitle.id)}
                            onChange={() => toggleItemSelection(albumTitle.id)}
                          />
                        </View>
                      )}
                    
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
                        {bulkDeleteMode && (
                          <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'center' }}>
                            Select
                          </th>
                        )}
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
                            {bulkDeleteMode && (
                              <td style={{ padding: '1rem', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedItems.includes(albumTitle.id)}
                                  onChange={() => toggleItemSelection(albumTitle.id)}
                                />
                              </td>
                            )}
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
                          <td colSpan={bulkDeleteMode ? "5" : "4"} style={{ textAlign: 'center', padding: '1rem' }}>
                            No records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </View>
              )
              
            }
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
