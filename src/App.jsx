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
  Image,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import "./App.css";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";
/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */

Amplify.configure(outputs);
const client = generateClient({
  authMode: "userPool",
});

export default function App() {
  const [albumTitles, setAlbumTitles] = useState([]);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  useEffect(() => {
    client.models.AlbumTitle.observeQuery().subscribe({
      next: (data) => setAlbumTitles([...data.items]),
    });
  }, []);

  async function createAlbumTitle(event) {
    event.preventDefault();
    const form = new FormData(event.target);
  
    try {
      await client.models.AlbumTitle.create({
        name: form.get("name"),
        title: form.get("title")  // No need for toString() since it's already a string
      });
  
      event.target.reset();
    } catch (error) {
      console.error('Error creating albumTitle:', error);
    }
  }

  async function deleteAlbumTitle({ id }) {
    const toBeDeletedAlbumTitle = {
      id,
    };

    await client.models.AlbumTitle.delete(toBeDeletedAlbumTitle);
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
      maxWidth="800px" // Adjust this value to control overall container width
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
            maxWidth: '300px' // Constrain logo size
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

    {/* Content below (Wishlist heading, cards/table, etc) */}
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

          
          {viewMode === 'card' ? (
  <Grid
    margin="3rem 0"
    autoFlow="column"
    justifyContent="center"
    gap="2rem"
    alignContent="center"
  >
    {albumTitles.map((albumTitle) => (
      <Flex
        key={albumTitle.id || albumTitle.name}
        direction="column"
        justifyContent="center"
        alignItems="center"
        gap="2rem"
        border="1px solid #ccc"
        padding="2rem"
        borderRadius="5%"
        className="box"
      >
        <View>
          <Heading level="3">{albumTitle.name}</Heading>
        </View>
        <Text fontStyle="italic">{albumTitle.title}</Text>
        <Button
          variation="destructive"
          onClick={() => deleteAlbumTitle(albumTitle)}
        >
          Delete Record
        </Button>
      </Flex>
    ))}
  </Grid>
) : (
  <View width="100%" margin="3rem 0">
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'left' }}>Artist/Band Name</th>
          <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'left' }}>Album Title</th>
          <th style={{ padding: '1rem', borderBottom: '2px solid #ccc', textAlign: 'center' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {albumTitles.map((albumTitle) => (
          <tr key={albumTitle.id || albumTitle.name}>
            <td style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>{albumTitle.name}</td>
            <td style={{ padding: '1rem', borderBottom: '1px solid #eee', fontStyle: 'italic' }}>{albumTitle.title}</td>
            <td style={{ padding: '1rem', borderBottom: '1px solid #eee', textAlign: 'center' }}>
              <Button
                variation="destructive"
                onClick={() => deleteAlbumTitle(albumTitle)}
              >
                Delete Record
              </Button>
            </td>
          </tr>
        ))}
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
