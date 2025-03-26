import React, { useState, useRef, useEffect } from 'react';
import { getLinkPreview } from '../helpers/api';
import { Button } from 'primereact/button';
import ReactMarkdown from 'react-markdown';
import { deleteLink } from '../helpers/api';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';

const Link = ({ link, onDelete }) => {
  const toast = useRef(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(link.link);
    toast.current.show({
      severity: 'success',
      summary: 'Copied',
      detail: 'Content copied to clipboard',
      life: 3000
    });
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteLink(link.idx);
      if (onDelete) {
        onDelete(link.idx);
      }
      setShowDeleteDialog(false);
      console.log('Creating success toast');
      toast.current.show({
        severity: 'success',
        summary: 'Deleted',
        detail: 'Item successfully deleted',
        life: 3000
      });
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete item',
        life: 3000
      });
    }
  };

  // URL validation regex
  const urlRegex = /^https?:\/\//;

  const isUrl = urlRegex.test(link.link);
  console.log(`Link is URL:`, isUrl, link.link);

  // Format the date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const fetchPreview = async () => {
      if (isUrl) {
        try {
          const prevresult = await getLinkPreview(link.link);
          setPreview(prevresult);
        } catch (error) {
          console.error('Error fetching preview:', error);
        }
      }
    };

    fetchPreview();
  }, [link.link, isUrl]); // Only re-run if the link or isUrl changes

  return (
    <div
      className="link-card"
      style={{
        margin: '1rem',
        padding: '1rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        maxWidth: '500px',
        ...(isUrl && { cursor: 'pointer' })  // Only add pointer cursor if it's a URL
      }}
      {...(isUrl && {
        onClick: (e) => {
          // Only open URL if not clicking on buttons
          if (!e.target.closest('button')) {
            window.open(link.link, '_blank', 'noopener noreferrer');
          }
        }
      })}
    >
      <Toast ref={toast} />
      {isUrl ? (
        // Handle as link
        <>
          {/* <a href={link.link} target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none'}}> */}
          {/* <LinkPreview url={link.link} width="100%" /> */}
          {preview && (
            <div>
              <h3>{preview.title}</h3>
              {
                preview.image && (
                  <img src={preview.image} alt={preview.title} style={{maxWidth: '100%'}} />
                )
              }
              <p>{preview.description}</p>
            </div>
          )}
          {/* </a> */}
          <div style={{
            fontSize: '0.8rem',
            color: '#666',
            marginTop: '0.5rem',
            textAlign: 'right'
          }}>
            Added: {formatDate(link.date)}
          </div>
        </>
      ) : (
        // Handle as markdown
        <>
          <div className="markdown-content">
            <ReactMarkdown>{link.link}</ReactMarkdown>
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: '#666',
            marginTop: '0.5rem',
            textAlign: 'right'
          }}>
            {formatDate(link.date)}
          </div>
        </>
      )}
      <div style={{marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem'}}>
        <Button
          icon="pi pi-trash"
          severity="danger"
          onClick={() => setShowDeleteDialog(true)}
          tooltip="Delete"
          tooltipOptions={{ position: 'top' }}
        />
        <Button
          icon="pi pi-copy"
          onClick={copyToClipboard}
          tooltip="Copy content"
          tooltipOptions={{ position: 'top' }}
        />
      </div>

      <Dialog
        visible={showDeleteDialog}
        onHide={() => setShowDeleteDialog(false)}
        header="Confirm Deletion"
        footer={
          <div>
            <Button label="No" icon="pi pi-times" onClick={() => setShowDeleteDialog(false)} className="p-button-text" />
            <Button label="Yes" icon="pi pi-check" onClick={handleDelete} severity="danger" autoFocus />
          </div>
        }
      >
        <p>Are you sure you want to delete this item?</p>
      </Dialog>
    </div>
  );
};

export default Link;
