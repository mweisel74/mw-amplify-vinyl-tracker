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
        <Image
          src={logo}
          alt="The Crate Digger's Wishlist"
          width="200px"
          height="194px"
          marginBottom="1rem"
        />
      </Flex>
    ),
  }}
>
      {({ signOut }) => (
        <Flex
          className="App"
          justifyContent="center"
          alignItems="center"
          direction="column"
          width="70%"
          margin="0 auto"
        >
          <img src={logo} className="logo" alt="The Crate Digger's Wishlist" width="500" height="486" />
          <View as="form" margin="3rem 0" onSubmit={createAlbumTitle}>
            <Flex
              direction="column"
              justifyContent="center"
              gap="2rem"
              padding="2rem"
            >
              <TextField
                name="name"
                placeholder="Artist/Band Name"
                label="Artist/Band Name"
                labelHidden
                variation="quiet"
                required
              />
              <TextField
                name="title"
                placeholder="Album Title"
                label="Album Title"
                labelHidden
                variation="quiet"
                required
                type="text"
              />

              <Button type="submit" variation="primary">
                Add Record
              </Button>
            </Flex>
          </View>
          <Divider />
          <Heading level={2}>My Vinyl Wishlist</Heading>
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
          <Button onClick={signOut}>Sign Out</Button>
        </Flex>
      )}
    </Authenticator>
  );
}