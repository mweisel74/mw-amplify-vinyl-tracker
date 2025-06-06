//SECTION 1 - Imports and Initial Setup

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

//SECTION 2 - Component Start and State Declarations:

export default function App() {
  const [albumTitles, setAlbumTitles] = useState([]);
  const [viewMode, setViewMode] = useState('card');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [editForm, setEditForm] = useState({
    name: '',
    title: '',
    notes: ''
  });

  const toggleItemSelection = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

//SECTION 3 - Core Functions (Part 1):

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
          setAlbumTitles(items || []);
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

//SECTION 4 - Core Functions (Part 2):

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to delete');
      return;
    }
  
    const isAllSelected = selectedItems.length === albumTitles.length;
    const warningMessage = isAllSelected 
      ? `⚠️ WARNING: You are about to delete ALL ${selectedItems.length} records from your collection. This action is permanent and cannot be undone.\n\nAre you absolutely sure you want to continue?`
      : `⚠️ WARNING: You are about to delete ${selectedItems.length} record(s). This action is permanent and cannot be undone.\n\nDo you want to continue?`;
  
    const confirmDelete = window.confirm(warningMessage);
  
    if (confirmDelete) {
      setIsLoading(true);
      try {
        // Delete all selected items
        await Promise.all(
          selectedItems.map(id => client.models.AlbumTitle.delete({ id }))
        );
        
        // Update local state by filtering out deleted items
        setAlbumTitles(prevTitles => 
          prevTitles.filter(title => !selectedItems.includes(title.id))
        );
        
        // Reset selection states
        setSelectedItems([]);
        setSelectAll(false);
        setBulkDeleteMode(false);
  
      } catch (error) {
        console.error('Error during bulk delete:', error);
        alert('Some items could not be deleted. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

    const handleSelectAll = () => {
      if (selectAll) {
        // If already all selected, deselect all
        setSelectedItems([]);
      } else {
        // Select all items
        const allIds = albumTitles.map(album => album.id);
        setSelectedItems(allIds);
      }
      setSelectAll(!selectAll);
    };
    
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

  //Function to sort
  const handleSort = (field) => {
    // If clicking the same field, toggle direction
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Create a function to get sorted albums
  const getSortedAlbums = () => {
    if (!sortField) return albumTitles;
  
    return [...albumTitles].sort((a, b) => {
      let aValue = a[sortField].toLowerCase();
      let bValue = b[sortField].toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

//SECTION 5 - Edit/Save Functions and CSV Import:

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

  function handleEdit(albumTitle) {
    setEditingId(albumTitle.id);
    setEditForm({
      name: albumTitle.name,
      title: albumTitle.title,
      notes: albumTitle.notes || ''
    });
  }

  function handleCancel() {
    setEditingId(null);
    setEditForm({ name: '', title: '', notes: '' });
  }

  const handleCSVImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsImporting(true);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const rows = text.split('\n');
          
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
            .filter(row => row.trim())
            .map((row, index) => {
              const values = row.split(',');
              return {
                rowNumber: index + 2,
                name: values[headers.indexOf('name')]?.trim(),
                title: values[headers.indexOf('title')]?.trim(),
                notes: values[headers.indexOf('notes')]?.trim() || null
              };
            });

          const validRecords = records.filter(record => record.name && record.title);
          const invalidRecords = records.filter(record => !record.name || !record.title);

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
          event.target.value = '';
        }
      };

      reader.onerror = () => {
        alert('Error reading file');
        setIsImporting(false);
      };

      reader.readAsText(file);
    }
  };

//SECTION 6 and 7 - Beginning of Return/JSX (Part 1 and 2):

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
            <Flex direction="row" alignItems="center" gap="1rem" flexWrap="wrap">
              <Heading level={2} style={{ marginRight: '2rem' }}>My Vinyl Wishlist</Heading>
              <Flex gap="1rem" alignItems="center">
                <Button
                  onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
                  variation="link"
                >
                  Switch to {viewMode === 'card' ? 'Table' : 'Card'} View
                </Button>
                
                <label htmlFor="csvInput" style={{ margin: 0 }}>
                  <Button
                    className="tooltip"
                    variation="link"
                    onClick={() => document.getElementById('csvInput').click()}
                    isLoading={isImporting}
                  >
                    {isImporting ? 'Importing...' : 'Import CSV'}
                    <span className="tooltip-text">Bulk import via CSV file</span>
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
                  className="tooltip"
                  variation="link"
                  onClick={() => {
                    setBulkDeleteMode(!bulkDeleteMode);
                    setSelectedItems([]);
                    setSelectAll(false);
                  }}
                >
                  {bulkDeleteMode ? '← Exit Bulk Delete' : 'Bulk Delete'}
                  <span className="tooltip-text">
                    {bulkDeleteMode ? 'Exit bulk delete mode' : 'Enter bulk delete mode'}
                  </span>
                </Button>
                
                
                {bulkDeleteMode && selectedItems.length > 0 && (
                  <Button
                    variation="destructive"
                    onClick={handleBulkDelete}
                  >
                    Delete Selected ({selectedItems.length})
                  </Button>
                )}
              </Flex>
            </Flex>
          
            {/* Select All section */}
            {bulkDeleteMode && (
              <Flex 
                direction="column"
                padding="1rem"
                backgroundColor="rgba(0, 0, 0, 0.03)"
                borderRadius="8px"
                margin="1rem 0"
                width="100%"
              >
                <Flex 
                  direction="row" 
                  alignItems="center" 
                  justifyContent="space-between"
                  gap="2rem"
                >
                  <Flex alignItems="center" gap="1rem">
                    <label 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                      <Text fontWeight="bold">Select All Records</Text>
                    </label>
                  </Flex>
                  <Text variation="secondary" style={{ fontSize: '0.9rem' }}>
                    {selectedItems.length} of {albumTitles.length} records selected
                  </Text>
                </Flex>
                <Text 
                  variation="secondary" 
                  style={{ 
                    fontSize: '0.85rem',
                    marginTop: '0.5rem' 
                  }}
                >
                  Tip: Select individual records or use "Select All" to delete multiple records at once
                </Text>
              </Flex>
            )}
          
            {isLoading ? (
              <View textAlign="center" padding="2rem">
                Loading...
              </View>
            ) : viewMode === 'card' ? (          

//SECTION 8 - Return/JSX (Part 3 - Card View):

            <View>
            {/* Grid of cards */}
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
                    {/* Individual checkbox for each card */}
                    {bulkDeleteMode && (
                      <View style={{ alignSelf: 'flex-start', marginBottom: '1rem' }}>
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
                          <Text fontSize="small">{albumTitle.notes || " "}</Text>
                        )}
                      </Flex>
              
                      {/* Bottom section with buttons */}
                      <Flex 
                        direction="row" 
                        gap="1rem"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          marginTop: 'auto'
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
            </View>
              
            ) : (

//SECTION 9 - Return/JSX (Part 4 - Table View):

              <View width="100%" margin="3rem 0">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead>
                   <tr>
                     {bulkDeleteMode && (
                       <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'center' }}>
                         <input
                           type="checkbox"
                           checked={selectAll}
                           onChange={handleSelectAll}
                           aria-label="Select all items"
                         />
                       </th>
                     )}
                     <th 
                       className="tooltip"
                       style={{ 
                         padding: '1rem', 
                         borderBottom: '2px solid #ccc', 
                         textAlign: 'left',
                         cursor: 'pointer', 
                         userSelect: 'none',
                         whiteSpace: 'nowrap'
                       }}
                       onClick={() => handleSort('name')}
                     >
                       Artist/Band Name<span style={{ marginLeft: '4px' }}>{sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                       <span className="tooltip-text">Click to sort by Artist/Band Name</span>
                     </th>
                     <th 
                       className="tooltip"
                       style={{ 
                         padding: '1rem', 
                         borderBottom: '2px solid #ccc', 
                         textAlign: 'left',
                         cursor: 'pointer', 
                         userSelect: 'none',
                         whiteSpace: 'nowrap'
                       }}
                       onClick={() => handleSort('title')}
                     >
                       Album Title<span style={{ marginLeft: '4px' }}>{sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                       <span className="tooltip-text">Click to sort by Album Title</span>
                     </th>
                     <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'left' }}>Notes</th>
                     <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'center' }}>Actions</th>
                   </tr>
                 </thead>
                 

                  <tbody>
                    {getSortedAlbums() && getSortedAlbums().length > 0 ? (
                      getSortedAlbums().map((albumTitle) => (
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
